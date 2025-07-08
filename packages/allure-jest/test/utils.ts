import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { attachment, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader, getPosixPath } from "allure-js-commons/sdk/reporter";

type TestFileWriter = (opts: { allureJestNodePath: string }) => string;

type TestFiles = Record<string, string | TestFileWriter>;

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
      const testFilePath = join(testDir, testFile);
      let testFileContent: string;

      if (typeof testFilesToWrite[testFile] === "string") {
        testFileContent = testFilesToWrite[testFile] as string;
      } else {
        testFileContent = (testFilesToWrite[testFile] as TestFileWriter)({
          allureJestNodePath,
        });
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
      stdio: "pipe",
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
      await rm(testDir, { recursive: true });
      await messageReader.attachResults();

      return resolve(messageReader.results);
    });
  });
};
