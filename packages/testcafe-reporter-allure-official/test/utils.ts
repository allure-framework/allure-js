import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import process from "node:process";

import type { TestResult, TestResultContainer } from "allure-js-commons";
import { ContentType, attachment, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { parseEnvInfo } from "allure-js-commons/sdk/reporter";
import createTestCafe from "testcafe";

import createAllureTestCafeReporter from "../src/index.js";
import type { AllureTestCafeReporterConfig } from "../src/model.js";
import { createAllureTestPlanFilter } from "../src/testplan.js";

type TestCafeTestFiles = Record<string, string>;
type TestCafeBrowserOption =
  | string
  | string[]
  | {
      path: string;
      cmd?: string;
    };

type TestCafeRunOptions = {
  env?: Record<string, string | undefined>;
  resultsDir?: string;
  createFixturePackageJson?: boolean;
  useTestPlanFilter?: boolean;
  browser?: TestCafeBrowserOption;
  concurrency?: number;
  testDirName?: string;
  screenshots?:
    | boolean
    | {
        path?: string;
        takeOnFails?: boolean;
        pathPattern?: string;
        pathPatternOnFails?: string;
        fullPage?: boolean;
        thumbnails?: boolean;
      };
  video?:
    | boolean
    | {
        path?: string;
        singleFile?: boolean;
        failedOnly?: boolean;
        pathPattern?: string;
        ffmpegPath?: string;
        encodingOptions?: Record<string, unknown>;
      };
  runOptions?: Record<string, unknown>;
  projectCwd?: string;
  projectCwdRelative?: string;
  reporterConfig?: Omit<AllureTestCafeReporterConfig, "resultsDir">;
};

type AllureResultsWithTimestamps = AllureResults & {
  timestamps: Map<string, Date>;
};

const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";
const DEFAULT_BROWSER_ARGS = process.platform === "linux" ? "--guest --no-sandbox" : "--guest";
const createChromiumBrowserAlias = (browserPath?: string) =>
  browserPath
    ? `chromium:${browserPath}:headless ${DEFAULT_BROWSER_ARGS}`
    : `chromium:headless ${DEFAULT_BROWSER_ARGS}`;
const DEFAULT_BROWSER = (() => {
  if (process.env.TESTCAFE_BROWSER) {
    return process.env.TESTCAFE_BROWSER;
  }

  if (process.env.PW_CHROMIUM_PATH) {
    return createChromiumBrowserAlias(process.env.PW_CHROMIUM_PATH);
  }

  return createChromiumBrowserAlias();
})();

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".properties": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webm": "video/webm",
};

export const PACKAGE_ROOT = join(__dirname, "..");
const TESTCAFE_TEMP_ROOT = join(tmpdir(), "allure-js-testcafe-reporter-allure-official");
const TESTCAFE_SELECTOR_PLACEHOLDER = /__TESTCAFE_SELECTOR__\(([^|]+)\|([^|]+)\|([^)]*)\)/g;
const TESTCAFE_PACKAGE_SELECTOR_PLACEHOLDER = /__TESTCAFE_PACKAGE_SELECTOR__\(([^|]+)\|([^|]+)\|([^)]*)\)/g;

const isPathInside = (rootPath: string, targetPath: string) => {
  const relativePath = relative(rootPath, targetPath);

  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
};

export const createTempFixtureDir = async (testDirName?: string) => {
  await mkdir(TESTCAFE_TEMP_ROOT, { recursive: true });

  if (testDirName) {
    const fixtureDir = join(TESTCAFE_TEMP_ROOT, testDirName);

    await rm(fixtureDir, { recursive: true, force: true });
    await mkdir(fixtureDir, { recursive: true });

    return fixtureDir;
  }

  return await mkdtemp(join(TESTCAFE_TEMP_ROOT, "fixture-"));
};

const createEmptyResults = (): AllureResultsWithTimestamps => ({
  tests: [],
  groups: [],
  attachments: {},
  globals: {},
  categories: [],
  envInfo: undefined,
  timestamps: new Map(),
});

const restoreAllureTestRuntime = (runtime: unknown) => {
  if (runtime === undefined) {
    delete (globalThis as Record<string, unknown>)[ALLURE_TEST_RUNTIME_KEY];
    return;
  }

  (globalThis as Record<string, unknown>)[ALLURE_TEST_RUNTIME_KEY] = runtime;
};

const getAttachmentOptions = (filename: string) => {
  const fileExtension = extname(filename).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXTENSION[fileExtension] ?? "application/octet-stream";

  return {
    contentType,
    fileExtension: fileExtension || ".bin",
  };
};

const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const rewritePackageReference = (content: string, packageName: string, replacement: string) => {
  const escapedPackageName = escapeForRegExp(packageName);

  return content
    .replace(new RegExp(`require\\("${escapedPackageName}"\\)`, "g"), `require(${JSON.stringify(replacement)})`)
    .replace(new RegExp(`require\\('${escapedPackageName}'\\)`, "g"), `require(${JSON.stringify(replacement)})`)
    .replace(new RegExp(`from "${escapedPackageName}"`, "g"), `from ${JSON.stringify(replacement)}`)
    .replace(new RegExp(`from '${escapedPackageName}'`, "g"), `from ${JSON.stringify(replacement)}`);
};

const rewriteInlineFixtureSource = (content: string, fromDir: string) => {
  const allureCommonsPath = getPackageRequirePath("allure-js-commons", fromDir);

  return rewritePackageReference(content, "allure-js-commons", allureCommonsPath);
};

const replaceInlineSelectorPlaceholders = (content: string, testDir: string, pathRoot: string) => {
  return content.replace(TESTCAFE_SELECTOR_PLACEHOLDER, (_match, fixtureFile, fixtureName, testName) => {
    const relativeFixturePath = relative(pathRoot, join(testDir, fixtureFile.trim())).replaceAll("\\", "/");

    return [relativeFixturePath, fixtureName.trim(), testName.trim()].filter(Boolean).join("#");
  });
};

const replaceInlinePackageSelectorPlaceholders = (content: string, testDir: string, pathRoot: string) => {
  return content.replace(TESTCAFE_PACKAGE_SELECTOR_PLACEHOLDER, (_match, fixtureFile, fixtureName, testName) => {
    const relativeFixturePath = relative(pathRoot, join(testDir, fixtureFile.trim())).replaceAll("\\", "/");

    return [relativeFixturePath, fixtureName.trim(), testName.trim()].filter(Boolean).join("#");
  });
};

const withEnv = async (env: Record<string, string | undefined>, body: () => Promise<void>) => {
  const previous = new Map<string, string | undefined>();

  Object.entries(env).forEach(([name, value]) => {
    previous.set(name, process.env[name]);

    if (value === undefined) {
      delete process.env[name];
      return;
    }

    process.env[name] = value;
  });

  try {
    await body();
  } finally {
    previous.forEach((value, name) => {
      if (value === undefined) {
        delete process.env[name];
        return;
      }

      process.env[name] = value;
    });
  }
};

const startStaticServer = async (rootDir: string) => {
  const resolvedRoot = resolve(rootDir);
  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
      const filePath = resolve(resolvedRoot, `.${pathname}`);
      const relativePath = relative(resolvedRoot, filePath);

      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }

      const fileContent = await readFile(filePath);

      res.setHeader("Content-Type", CONTENT_TYPE_BY_EXTENSION[extname(filePath)] ?? "application/octet-stream");
      res.end(fileContent);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectPromise);
      resolvePromise();
    });
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve the local TestCafe fixture server address");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error);
            return;
          }

          resolvePromise();
        });
      });
    },
  };
};

export const readAllureResultsDir = async (resultsDir: string): Promise<AllureResultsWithTimestamps> => {
  const result = createEmptyResults();
  const filesInResultsDir = (await readdir(resultsDir).catch(() => [] as string[])).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const resultFile of filesInResultsDir) {
    const fullPath = join(resultsDir, resultFile);

    if (resultFile === "categories.json") {
      const categories = JSON.parse(await readFile(fullPath, "utf8"));
      result.categories = categories;
      await attachment(resultFile, JSON.stringify(categories, null, 2), ContentType.JSON);
      continue;
    }

    if (resultFile === "environment.properties") {
      const content = await readFile(fullPath, "utf8");
      result.envInfo = parseEnvInfo(content);
      await attachment(resultFile, content, ContentType.TEXT);
      continue;
    }

    if (/-attachment\.\S+$/.test(resultFile)) {
      const fileBuffer = await readFile(fullPath);
      result.attachments[resultFile] = fileBuffer;
      await attachment(resultFile, fileBuffer, getAttachmentOptions(resultFile));
      continue;
    }

    if (/-container\.json$/.test(resultFile)) {
      const container = JSON.parse(await readFile(fullPath, "utf8")) as TestResultContainer;
      result.groups.push(container);
      await attachment(resultFile, JSON.stringify(container, null, 2), ContentType.JSON);
      continue;
    }

    if (/-globals\.json$/.test(resultFile)) {
      const globals = JSON.parse(await readFile(fullPath, "utf8"));
      result.globals ??= {};
      result.globals[resultFile] = globals;
      await attachment(resultFile, JSON.stringify(globals, null, 2), ContentType.JSON);
      continue;
    }

    if (/-result\.json$/.test(resultFile)) {
      const testResult = JSON.parse(await readFile(fullPath, "utf8")) as TestResult;
      result.tests.push(testResult);
      result.timestamps.set(testResult.uuid, (await stat(fullPath)).ctime);
      await attachment(resultFile, JSON.stringify(testResult, null, 2), ContentType.JSON);
    }
  }

  return result;
};

export const runTestCafeInlineTest = async (
  files: TestCafeTestFiles,
  {
    env = {},
    resultsDir = "allure-results",
    createFixturePackageJson = true,
    useTestPlanFilter = false,
    browser = DEFAULT_BROWSER,
    concurrency,
    testDirName,
    screenshots = false,
    video = false,
    runOptions = { disableNativeAutomation: true },
    projectCwd,
    projectCwdRelative,
    reporterConfig = {},
  }: TestCafeRunOptions = {},
): Promise<AllureResultsWithTimestamps> => {
  const testDir = await createTempFixtureDir(testDirName);
  const executionCwd = projectCwd ?? (projectCwdRelative ? join(testDir, projectCwdRelative) : testDir);
  const resolvedResultsDir = isAbsolute(resultsDir) ? resultsDir : join(executionCwd, resultsDir);
  const packageJsonPath = join(executionCwd, "package.json");
  const shouldCreateFixturePackageJson = createFixturePackageJson && isPathInside(testDir, packageJsonPath);
  const previousAllureRuntime = (globalThis as Record<string, unknown>)[ALLURE_TEST_RUNTIME_KEY];
  const oldCwd = process.cwd();
  let staticServer: Awaited<ReturnType<typeof startStaticServer>> | undefined;

  try {
    await step(`prepare test dir ${testDir}`, async () => {
      await mkdir(testDir, { recursive: true });
      await mkdir(executionCwd, { recursive: true });

      if (shouldCreateFixturePackageJson) {
        await writeFile(packageJsonPath, JSON.stringify({ name: "testcafe-fixture" }, null, 2), "utf8");
        await attachment("package.json", await readFile(packageJsonPath, "utf8"), ContentType.JSON);
      }
    });

    await step("write inline fixture files", async (ctx) => {
      await ctx.parameter("Files", String(Object.keys(files).length));

      for (const [filename, originalContent] of Object.entries(files)) {
        const filepath = join(testDir, filename);
        const contentWithResolvedSelectors = replaceInlinePackageSelectorPlaceholders(
          replaceInlineSelectorPlaceholders(originalContent, testDir, executionCwd),
          testDir,
          oldCwd,
        );
        const content = /\.(?:[cm]?[jt]s|tsx?)$/.test(filename)
          ? rewriteInlineFixtureSource(contentWithResolvedSelectors, dirname(filepath))
          : contentWithResolvedSelectors;

        await mkdir(dirname(filepath), { recursive: true });
        await writeFile(filepath, content, "utf8");
        await attachment(filename, content, CONTENT_TYPE_BY_EXTENSION[extname(filename)] ?? ContentType.TEXT);
      }
    });

    const testFiles = Object.keys(files)
      .filter((filename) => /\.(?:[cm]?js|ts)$/.test(filename))
      .map((filename) => join(testDir, filename));

    staticServer = await startStaticServer(testDir);
    await rm(resolvedResultsDir, { recursive: true, force: true });

    await withEnv({ ...env, TESTCAFE_BASE_URL: staticServer.baseUrl }, async () => {
      process.chdir(executionCwd);

      const testcafe = await createTestCafe("127.0.0.1");

      try {
        const runner = testcafe.createRunner();

        runner.src(testFiles).browsers(browser);
        if (typeof concurrency === "number" && concurrency > 1) {
          runner.concurrency(concurrency);
        }

        if (screenshots) {
          const screenshotOptions =
            typeof screenshots === "object"
              ? screenshots
              : {
                  takeOnFails: true,
                  thumbnails: false,
                };

          runner.screenshots({
            path: screenshotOptions.path ?? join(testDir, "screenshots"),
            takeOnFails: screenshotOptions.takeOnFails ?? true,
            pathPattern: screenshotOptions.pathPattern,
            pathPatternOnFails: screenshotOptions.pathPatternOnFails,
            fullPage: screenshotOptions.fullPage ?? false,
            thumbnails: screenshotOptions.thumbnails ?? false,
          });
        }

        if (video) {
          const videoOptions =
            typeof video === "object"
              ? video
              : {
                  singleFile: false,
                  failedOnly: false,
                };

          runner.video(
            videoOptions.path ?? join(testDir, "videos"),
            {
              singleFile: videoOptions.singleFile ?? false,
              failedOnly: videoOptions.failedOnly ?? false,
              pathPattern: videoOptions.pathPattern,
              ffmpegPath: videoOptions.ffmpegPath,
            },
            videoOptions.encodingOptions,
          );
        }

        runner.reporter(
          createAllureTestCafeReporter({
            ...reporterConfig,
            resultsDir: resolvedResultsDir,
          }),
        );

        if (useTestPlanFilter) {
          const filter = createAllureTestPlanFilter({ cwd: executionCwd });
          if (filter) {
            runner.filter(filter);
          }
        }

        await step("run testcafe", async (ctx) => {
          await ctx.parameter("Browser", JSON.stringify(browser));
          if (typeof concurrency === "number") {
            await ctx.parameter("Concurrency", String(concurrency));
          }
          await ctx.parameter("CWD", executionCwd);
          if (Object.keys(env).length > 0) {
            await attachment("Extra environment variables", JSON.stringify(env), ContentType.JSON);
          }

          const failed = await runner.run({
            skipJsErrors: true,
            ...runOptions,
          });

          await ctx.parameter("Failed tests", String(failed));
        });
      } finally {
        await testcafe.close();
      }
    });

    restoreAllureTestRuntime(previousAllureRuntime);

    return await step("collect generated allure results", async (ctx) => {
      const resultFiles = (await readdir(resolvedResultsDir).catch(() => [] as string[])).sort((left, right) =>
        left.localeCompare(right),
      );

      await ctx.parameter("Result files", String(resultFiles.length));
      await attachment("allure-results-files.json", JSON.stringify(resultFiles, null, 2), ContentType.JSON);

      const results = await step("parse allure results", async () => await readAllureResultsDir(resolvedResultsDir));

      await ctx.parameter("Logical tests", String(results.tests.length));
      await ctx.parameter("Containers", String(results.groups.length));

      return results;
    });
  } finally {
    restoreAllureTestRuntime(previousAllureRuntime);
    process.chdir(oldCwd);

    if (staticServer) {
      try {
        await staticServer.close();
      } catch {
        // Best effort cleanup for test harness resources.
      }
    }

    await rm(resolvedResultsDir, { recursive: true, force: true });
    await rm(testDir, { recursive: true, force: true });
  }
};

const toRequirePath = (fromDir: string, resolvedPath: string) => {
  const relativePath = relative(fromDir, resolvedPath);
  const normalizedPath = relativePath.replaceAll("\\", "/");

  if (isAbsolute(relativePath)) {
    return normalizedPath;
  }

  return normalizedPath.startsWith(".") ? normalizedPath : `./${normalizedPath}`;
};

export const getPackageRequirePath = (request: string, fromDir: string) => {
  const resolvedPath = isAbsolute(request) ? request : require.resolve(request);

  return toRequirePath(fromDir, resolvedPath);
};

export const check = async <T>(name: string, body: () => T | Promise<T>) => {
  return await step(name, async () => await body());
};
