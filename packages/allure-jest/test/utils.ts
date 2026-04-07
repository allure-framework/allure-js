import { fork, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";

import { attachment, step } from "allure-js-commons";
import { stripAnsi, type AllureResults } from "allure-js-commons/sdk";
import { MessageReader, getPosixPath } from "allure-js-commons/sdk/reporter";

import { parseEnvInfo } from "../../allure-js-commons/src/sdk/reporter/utils/envInfo.js";

type TestFileWriter = (opts: { allureJestNodePath: string }) => string;

type TestFiles = Record<string, string | TestFileWriter>;

type BunTestFiles = Record<string, string>;

type BunRunOptions = {
  env?: (testDir: string) => Record<string, string>;
  args?: string[];
  cwd?: string;
};

export type BunInlineTestResult = AllureResults & {
  stdout: string[];
  stderr: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

const bunBinary = process.env.BUN_BINARY ?? "bun";

export const isBunAvailable = (() => {
  const result = spawnSync(bunBinary, ["--version"], {
    stdio: "ignore",
  });

  return !result.error && result.status === 0;
})();

const attachProcessOutput = async (stdout: string[], stderr: string[]) => {
  if (stdout.length) {
    await attachment("stdout", stdout.join("\n"), {
      contentType: "text/plain",
    });
  }

  if (stderr.length) {
    await attachment("stderr", stderr.join("\n"), {
      contentType: "text/plain",
    });
  }
};

const writeInlineFile = async (testDir: string, testFile: string, content: string) => {
  const testFilePath = join(testDir, testFile);

  await mkdir(dirname(testFilePath), { recursive: true });
  await writeFile(testFilePath, content, "utf8");
  await attachment(testFile, content, {
    contentType: "text/plain",
    encoding: "utf-8",
    fileExtension: extname(testFile),
  });
};

const readAllureResults = async (resultsDir: string): Promise<AllureResults> => {
  const results: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
    globals: {},
  };

  let files: string[];

  try {
    files = (await readdir(resultsDir)).sort();
  } catch {
    return results;
  }

  for (const file of files) {
    const filePath = join(resultsDir, file);

    if (file.endsWith("-result.json")) {
      results.tests.push(JSON.parse(await readFile(filePath, "utf8")));
      continue;
    }

    if (file.endsWith("-container.json")) {
      results.groups.push(JSON.parse(await readFile(filePath, "utf8")));
      continue;
    }

    if (file === "categories.json") {
      results.categories = JSON.parse(await readFile(filePath, "utf8"));
      continue;
    }

    if (file === "environment.properties") {
      results.envInfo = parseEnvInfo(await readFile(filePath, "utf8"));
      continue;
    }

    results.attachments[file] = await readFile(filePath);
  }

  return results;
};

export const runJestInlineTest = async (
  testFiles: TestFiles,
  env?: (testDir: string) => Record<string, string>,
  cliArgs?: string[],
): Promise<AllureResults> => {
  const testDir = join(__dirname, "fixtures", randomUUID());
  const configFileName = "jest.config.js";
  const configFilePath = join(testDir, configFileName);
  const allureJestNode = require.resolve("allure-jest/node");
  const allureJestNodePath = getPosixPath(relative(testDir, allureJestNode));
  const testFilesToWrite: TestFiles = {
    [configFileName]: `
      const config = {
        bail: false,
        testEnvironment: "${allureJestNodePath}",
        testEnvironmentOptions: {
          links: {
            issue: {
              urlTemplate: "https://example.org/issues/%s",
            },
            tms: {
              urlTemplate: "https://example.org/tasks/%s",
            }
          },
          environmentInfo: {
            "app version": "123.0.1",
            "some other key": "some other value"
          },
          categories: [{
            name: "first"
          },{
            name: "second"
          }]
        },
      };

      module.exports = config;
    `,
    ...testFiles,
  };

  await step("create test dir", async () => {
    await mkdir(testDir, { recursive: true });
  });

  // eslint-disable-next-line guard-for-in
  for (const testFile in testFilesToWrite) {
    await step(testFile, async () => {
      let testFileContent: string;

      if (typeof testFilesToWrite[testFile] === "string") {
        testFileContent = testFilesToWrite[testFile] as string;
      } else {
        testFileContent = (testFilesToWrite[testFile] as TestFileWriter)({
          allureJestNodePath,
        });
      }

      await writeInlineFile(testDir, testFile, testFileContent);
    });
  }

  const modulePath = await step("resolve jest", () => {
    return require.resolve("jest-cli/bin/jest");
  });
  const args = ["--config", configFilePath, "--roots", testDir, ...(cliArgs ?? [])];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ALLURE_TEST_MODE: "1",
        ...env?.(testDir),
      },
      cwd: testDir,
      silent: true,
    });
  });
  const messageReader = new MessageReader();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  testProcess.on("message", messageReader.handleMessage);
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true, maxRetries: 3, retryDelay: 1000 });
      await messageReader.attachResults();

      return resolve(messageReader.results);
    });
  });
};

export const runBunInlineTest = async (
  testFiles: BunTestFiles,
  { env, args = [], cwd }: BunRunOptions = {},
): Promise<BunInlineTestResult> => {
  if (!isBunAvailable) {
    throw new Error("Bun is not available in PATH. Install Bun or set BUN_BINARY to run Bun integration tests.");
  }

  const testDir = join(__dirname, "fixtures", randomUUID());
  const resultsDir = join(testDir, "allure-results");
  const packagesDir = join(__dirname, "..", "..");
  const allureJsCommonsDistDir = join(packagesDir, "allure-js-commons", "dist", "esm");
  const allureJsCommonsPath = getPosixPath(join(allureJsCommonsDistDir, "index.js"));
  const allureJsCommonsSdkPath = getPosixPath(join(allureJsCommonsDistDir, "sdk", "index.js"));
  const allureJsCommonsReporterPath = getPosixPath(join(allureJsCommonsDistDir, "sdk", "reporter", "index.js"));
  const allureJsCommonsRuntimePath = getPosixPath(join(allureJsCommonsDistDir, "sdk", "runtime", "index.js"));
  const allureJestBunPath = getPosixPath(join(__dirname, "..", "dist", "esm", "bun.js"));
  const testFilesToWrite: BunTestFiles = {
    "bunfig.toml": `
[test]
preload = ["./preload.ts"]
`,
    "package.json": JSON.stringify({ name: "dummy", type: "module" }),
    "preload.ts": `
import { mock } from "bun:test";

mock.module("allure-js-commons", () => import("${allureJsCommonsPath}"));
mock.module("allure-js-commons/sdk", () => import("${allureJsCommonsSdkPath}"));
mock.module("allure-js-commons/sdk/reporter", () => import("${allureJsCommonsReporterPath}"));
mock.module("allure-js-commons/sdk/runtime", () => import("${allureJsCommonsRuntimePath}"));

await import("${allureJestBunPath}");
`,
    ...testFiles,
  };

  await step("create test dir", async () => {
    await mkdir(testDir, { recursive: true });
  });

  for (const [testFile, content] of Object.entries(testFilesToWrite)) {
    await step(testFile, async () => {
      await writeInlineFile(testDir, testFile, content);
    });
  }

  const bunArgs = [`--config=${join(testDir, "bunfig.toml")}`, "test", ...args];
  const testProcess = await step(`${bunBinary} ${bunArgs.join(" ")}`, () => {
    return spawn(bunBinary, bunArgs, {
      cwd: cwd ? join(testDir, cwd) : testDir,
      env: {
        ...process.env,
        ALLURE_RESULTS_DIR: resultsDir,
        ...env?.(testDir),
      },
      stdio: "pipe",
    });
  });

  const stdout: string[] = [];
  const stderr: string[] = [];

  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    const value = String(chunk);
    process.stdout.write(value);
    stdout.push(stripAnsi(value));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    const value = String(chunk);
    process.stderr.write(value);
    stderr.push(stripAnsi(value));
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async (exitCode, signal) => {
      const results = await readAllureResults(resultsDir);

      await attachProcessOutput(stdout, stderr);
      await rm(testDir, { recursive: true, maxRetries: 3, retryDelay: 1000 });

      resolve({
        ...results,
        stdout,
        stderr,
        exitCode,
        signal,
      });
    });
  });
};
