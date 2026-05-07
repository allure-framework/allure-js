import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import { attachment, step } from "allure-js-commons";
import { stripAnsi, type AllureResults } from "allure-js-commons/sdk";
import { getPosixPath } from "allure-js-commons/sdk/reporter";

import { parseEnvInfo } from "../../allure-js-commons/src/sdk/reporter/utils/envInfo.js";

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

    if (file.endsWith("-globals.json")) {
      results.globals![file] = JSON.parse(await readFile(filePath, "utf8"));
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
  const allureJsCommonsSyncPath = getPosixPath(join(allureJsCommonsDistDir, "sync.js"));
  const allureJsCommonsSdkPath = getPosixPath(join(allureJsCommonsDistDir, "sdk", "index.js"));
  const allureJsCommonsReporterPath = getPosixPath(join(allureJsCommonsDistDir, "sdk", "reporter", "index.js"));
  const allureJsCommonsRuntimePath = getPosixPath(join(allureJsCommonsDistDir, "sdk", "runtime", "index.js"));
  const allureBunSetupPath = getPosixPath(join(__dirname, "..", "dist", "esm", "setup.js"));
  const testFilesToWrite: BunTestFiles = {
    "bunfig.toml": `
[test]
preload = ["./preload.ts"]
`,
    "package.json": JSON.stringify({ name: "dummy", type: "module" }),
    "preload.ts": `
import { mock } from "bun:test";

mock.module("allure-js-commons", () => import("${allureJsCommonsPath}"));
mock.module("allure-js-commons/sync", () => import("${allureJsCommonsSyncPath}"));
mock.module("allure-js-commons/sdk", () => import("${allureJsCommonsSdkPath}"));
mock.module("allure-js-commons/sdk/reporter", () => import("${allureJsCommonsReporterPath}"));
mock.module("allure-js-commons/sdk/runtime", () => import("${allureJsCommonsRuntimePath}"));

await import("${allureBunSetupPath}");
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
    const bunTodoModeEnabled = args.includes("--todo");
    const testNamePatternIndex = args.findIndex((arg) => arg === "-t" || arg === "--test-name-pattern");
    const testNamePatternArg = args.find((arg) => arg.startsWith("--test-name-pattern="));
    const testNamePattern =
      testNamePatternIndex === -1
        ? testNamePatternArg?.slice("--test-name-pattern=".length)
        : args[testNamePatternIndex + 1];
    const retryIndex = args.findIndex((arg) => arg === "--retry");
    const retryArg = args.find((arg) => arg.startsWith("--retry="));
    const retry = retryIndex === -1 ? retryArg?.slice("--retry=".length) : args[retryIndex + 1];

    return spawn(bunBinary, bunArgs, {
      cwd: cwd ? join(testDir, cwd) : testDir,
      env: {
        ...process.env,
        ALLURE_RESULTS_DIR: resultsDir,
        ALLURE_BUN_TODO_MODE: bunTodoModeEnabled ? "1" : process.env.ALLURE_BUN_TODO_MODE,
        ALLURE_BUN_CONCURRENT_MODE: args.includes("--concurrent") ? "1" : process.env.ALLURE_BUN_CONCURRENT_MODE,
        ALLURE_BUN_RANDOMIZE_MODE: args.includes("--randomize") ? "1" : process.env.ALLURE_BUN_RANDOMIZE_MODE,
        ALLURE_BUN_TEST_NAME_PATTERN: testNamePattern ?? process.env.ALLURE_BUN_TEST_NAME_PATTERN,
        ALLURE_BUN_RETRY: retry ?? process.env.ALLURE_BUN_RETRY,
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
