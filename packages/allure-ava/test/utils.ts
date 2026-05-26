import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { attachment, logStep, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { stripAnsi } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import { MessageReader, getPosixPath } from "allure-js-commons/sdk/reporter";

export type TestFileAccessor = (opts: {
  allureAvaIndexPath: string;
  allureAvaSetupPath: string;
  allureResultsPath: string;
  avaCliPath: string;
  avaModulePath: string;
  commonsModulePath: string;
  testDir: string;
}) => string;

export type TestFiles = Record<string, string | TestFileAccessor>;

export type AvaRunResults = AllureResults & {
  exitCode: number;
  stderr: string;
  stdout: string;
};

export type AvaRunOptions = {
  args?: string[];
  cwd?: string;
  reporterConfig?: ReporterConfig;
};

const localRequire = createRequire(import.meta.url);
const fileDirname = dirname(fileURLToPath(import.meta.url));
const packageDirname = dirname(fileDirname);
const repositoryDirname = dirname(dirname(packageDirname));

const resolveAvaRoot = () => dirname(dirname(localRequire.resolve("ava")));

const resolveAvaCli = () => {
  const avaRoot = resolveAvaRoot();
  const candidates = [join(avaRoot, "entrypoints", "cli.js"), join(avaRoot, "entrypoints", "cli.mjs")];
  const cliPath = candidates.find((candidate) => existsSync(candidate));

  if (!cliPath) {
    throw new Error(`Unable to resolve AVA CLI from ${avaRoot}`);
  }

  return cliPath;
};

const resolveAllureCommonsEsm = () => {
  const cjsEntry = localRequire.resolve("allure-js-commons");
  const packageRoot = dirname(dirname(dirname(cjsEntry)));

  return join(packageRoot, "dist", "esm", "index.js");
};

const toImportSpecifier = (path: string) => pathToFileURL(path).href;

const normalizeRunOptions = (options: string[] | AvaRunOptions): AvaRunOptions =>
  Array.isArray(options) ? { args: options } : options;

export const runAvaInlineTest = async (
  testFiles: TestFiles,
  rawOptions: string[] | AvaRunOptions = {},
): Promise<AvaRunResults> => {
  const options = normalizeRunOptions(rawOptions);
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const allureResultsPath = getPosixPath(join(testDir, "allure-results"));
  const reporterConfig = {
    ...options.reporterConfig,
    resultsDir: allureResultsPath,
  };
  const fixtureAccessorOpts = {
    allureAvaIndexPath: toImportSpecifier(join(packageDirname, "dist", "index.js")),
    allureAvaSetupPath: toImportSpecifier(join(packageDirname, "dist", "setup.js")),
    allureResultsPath,
    avaCliPath: resolveAvaCli(),
    avaModulePath: toImportSpecifier(localRequire.resolve("ava")),
    commonsModulePath: toImportSpecifier(resolveAllureCommonsEsm()),
    testDir: getPosixPath(testDir),
  };
  const testFilesToWrite: TestFiles = {
    "package.json": JSON.stringify({ name: "dummy", type: "module" }),
    "ava.config.mjs": `
      import { installAllureAva } from "${fixtureAccessorOpts.allureAvaIndexPath}";

      await installAllureAva({
        reporterConfig: ${JSON.stringify(reporterConfig)},
        setupModule: ${JSON.stringify(fixtureAccessorOpts.allureAvaSetupPath)},
      });

      export default {};
    `,
    ...testFiles,
  };

  await step("create AVA test dir", async () => {
    await mkdir(testDir, { recursive: true });
  });

  for (const testFile of Object.keys(testFilesToWrite)) {
    await step(`write test file "${testFile}"`, async () => {
      const testFilePath = join(testDir, testFile);
      const fileContent =
        typeof testFilesToWrite[testFile] === "string"
          ? (testFilesToWrite[testFile] as string)
          : (testFilesToWrite[testFile] as TestFileAccessor)(fixtureAccessorOpts);

      await mkdir(dirname(testFilePath), { recursive: true });
      await writeFile(testFilePath, fileContent, "utf8");
      await attachment(testFile, fileContent, {
        contentType: "text/plain",
        encoding: "utf-8",
        fileExtension: extname(testFile),
      });
    });
  }

  const forkCwd = options.cwd ? join(testDir, options.cwd) : testDir;

  await mkdir(forkCwd, { recursive: true });

  const allArgs = [...(options.args ?? [])];
  const testProcess = await step(`${fixtureAccessorOpts.avaCliPath} ${allArgs.join(" ")}`, () =>
    fork(fixtureAccessorOpts.avaCliPath, allArgs, {
      cwd: forkCwd,
      env: {
        ...process.env,
        ALLURE_TEST_MODE: "1",
      },
      silent: true,
    }),
  );
  const messageReader = new MessageReader();
  const stdout: string[] = [];
  const stderr: string[] = [];

  testProcess.on("message", messageReader.handleMessage);
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    stdout.push(stripAnsi(String(chunk)));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    stderr.push(stripAnsi(String(chunk)));
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async (code, signal) => {
      if (signal) {
        await logStep(`Interrupted with ${signal}`);
      }
      if (code) {
        await logStep(`Exit code: ${code}`);
      }

      const cleanStdout = stdout.join("");
      const cleanStderr = stderr.join("");

      await attachment("stdout", cleanStdout, "text/plain");
      await attachment("stderr", cleanStderr, "text/plain");
      await rm(testDir, { recursive: true, maxRetries: 3, retryDelay: 1000 });
      await messageReader.attachResults();

      resolve({
        ...messageReader.results,
        exitCode: code ?? 0,
        stdout: cleanStdout,
        stderr: cleanStderr,
      });
    });
  });
};

export const repositoryPath = (path: string) => join(repositoryDirname, path);
