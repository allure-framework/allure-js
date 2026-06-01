import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { attachment, step } from "allure-js-commons";
import { stripAnsi, type AllureResults } from "allure-js-commons/sdk";

import { parseEnvInfo } from "../../allure-js-commons/src/sdk/reporter/utils/envInfo.js";

type NodeTestFiles = Record<string, string>;

type NodeRunOptions = {
  env?: (testDir: string) => Record<string, string | undefined>;
  setup?: boolean;
};

export type NodeInlineTestResult = AllureResults & {
  stdout: string[];
  stderr: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
};

const fileDirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(fileDirname, "..", "..", "..");

const nodeVersion = process.versions.node.split(".").map((part) => Number.parseInt(part, 10));

export const supportsNodeTestRuntimeApi =
  (nodeVersion[0] ?? 0) > 26 || ((nodeVersion[0] ?? 0) === 26 && (nodeVersion[1] ?? 0) >= 1);

const writeInlineFile = async (testDir: string, testFile: string, content: string) => {
  const testFilePath = join(testDir, testFile);

  await mkdir(dirname(testFilePath), { recursive: true });
  await writeFile(testFilePath, content, "utf8");
  await attachment(testFile, content, {
    contentType: "text/plain",
    encoding: "utf-8",
    fileExtension: extname(testFile),
  });

  return testFilePath;
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

const getPnpArgs = () => {
  const pnpRequire = join(repoRoot, ".pnp.cjs");
  const pnpLoader = join(repoRoot, ".pnp.loader.mjs");
  const args: string[] = [];

  if (existsSync(pnpRequire)) {
    args.push("--require", pnpRequire);
  }

  if (existsSync(pnpLoader)) {
    args.push("--experimental-loader", pathToFileURL(pnpLoader).href);
  }

  return args;
};

export const runNodeInlineTest = async (
  testFiles: NodeTestFiles,
  { env = () => ({}), setup = false }: NodeRunOptions = {},
): Promise<NodeInlineTestResult> => {
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const resultsDir = join(testDir, "allure-results");
  const reporterModulePath = pathToFileURL(join(fileDirname, "..", "dist", "esm", "reporter.js")).href;
  const setupModulePath = pathToFileURL(join(fileDirname, "..", "dist", "esm", "setup.js")).href;
  const testFilePaths: string[] = [];

  await step("create test dir", async () => {
    await mkdir(testDir, { recursive: true });
  });

  for (const [testFile, content] of Object.entries(testFiles)) {
    await step(testFile, async () => {
      testFilePaths.push(await writeInlineFile(testDir, testFile, content));
    });
  }

  const args = [
    ...getPnpArgs(),
    "--test",
    ...(setup ? ["--import", setupModulePath] : []),
    "--test-reporter",
    reporterModulePath,
    ...testFilePaths,
  ];

  const testProcess = await step(`${process.execPath} ${args.join(" ")}`, () => {
    const subprocessEnv = {
      ...process.env,
      ALLURE_RESULTS_DIR: resultsDir,
      ALLURE_TEST_MODE: undefined,
      ...(env?.(testDir) ?? {}),
    };

    return spawn(process.execPath, args, {
      cwd: testDir,
      env: subprocessEnv,
      stdio: "pipe",
    });
  });

  const stdout: string[] = [];
  const stderr: string[] = [];

  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    stdout.push(stripAnsi(String(chunk)));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    stderr.push(stripAnsi(String(chunk)));
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async (exitCode, signal) => {
      const results = await readAllureResults(resultsDir);

      await attachment("stdout", stdout.join("\n"), "text/plain");
      await attachment("stderr", stderr.join("\n"), "text/plain");
      await rm(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });

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
