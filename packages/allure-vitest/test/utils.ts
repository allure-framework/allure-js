import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { env as processEnv } from "node:process";
import { fileURLToPath } from "url";
import { attachment, logStep, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { stripAnsi } from "allure-js-commons/sdk";
import { MessageReader, getPosixPath } from "allure-js-commons/sdk/reporter";

type TestFileAccessor = (opts: {
  setupModulePath: string;
  reporterModulePath: string;
  allureResultsPath: string;
  testDir: string;
}) => string;

type TestFiles = Record<string, string | TestFileAccessor>;

type Opts = {
  env?: (testDir: string) => Record<string, string>;
  cwd?: string;
};

const fileDirname = dirname(fileURLToPath(import.meta.url));

export const runVitestInlineTest = async (
  testFiles: TestFiles,
  { env = () => ({}), cwd }: Opts = {},
): Promise<AllureResults> => {
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const configFilename = "vitest.config.ts";
  // getPosixPath allows us to interpolate such paths without escaping
  const setupModulePath = getPosixPath(require.resolve("allure-vitest/setup"));
  const reporterModulePath = getPosixPath(require.resolve("allure-vitest/reporter"));
  const allureResultsPath = getPosixPath(join(testDir, "allure-results"));
  const fixtureAccessorOpts = {
    setupModulePath,
    reporterModulePath,
    allureResultsPath,
    testDir,
  };

  const testFilesToWrite: TestFiles = {
    [configFilename]: `
      import { defineConfig } from "vitest/config";

      export default defineConfig({
        test: {
          setupFiles: ["${setupModulePath}"],
          reporters: [
            "verbose",
            ["${reporterModulePath}", {
              links: {
                issue: {
                  urlTemplate: "https://example.org/issue/%s",
                },
                tms: {
                  urlTemplate: "https://example.org/tms/%s",
                },
              },
              resultsDir: "${allureResultsPath}",
            }]
          ],
        },
      });
    `,
    ...testFiles,
  };

  await step("create test dir", async () => {
    await mkdir(testDir, { recursive: true });
  });

  // eslint-disable-next-line guard-for-in
  for (const testFile in testFilesToWrite) {
    await step(`write test file "${testFile}"`, async () => {
      const testFilePath = join(testDir, testFile);
      let testFileContent: string;

      if (typeof testFilesToWrite[testFile] === "string") {
        testFileContent = testFilesToWrite[testFile] as string;
      } else {
        testFileContent = (testFilesToWrite[testFile] as TestFileAccessor)(fixtureAccessorOpts);
      }

      await mkdir(dirname(testFilePath), { recursive: true });
      await writeFile(testFilePath, testFileContent, "utf8");
      await attachment(testFile, testFileContent, {
        contentType: "text/plain",
        encoding: "utf-8",
        fileExtension: extname(testFile),
      });
    });
  }

  const modulePath = await step("resolve vitest", () => {
    return require.resolve("vitest/dist/cli.js");
  });
  const args = ["run", "--config", configFilename, "--dir", "."];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, async () => {
    const subprocessEnv: Record<string, string> = {
      ...processEnv,
      ALLURE_TEST_MODE: "1",
      ...env(testDir),
    };

    return fork(modulePath, args, {
      env: { ...subprocessEnv },
      cwd: cwd ? join(testDir, cwd) : testDir,
      stdio: "pipe",
    });
  });

  const messageReader = new MessageReader();
  const stdout: string[] = [];
  const stderr: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      await attachment("stdout", stdout.join("\n"), "text/plain");
      await attachment("stderr", stderr.join("\n"), "text/plain");
      await rm(testDir, { recursive: true });
      await messageReader.attachResults();

      return resolve(messageReader.results);
    });
  });
};
