import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { attachment, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runJestInlineTest = async (testContent: string): Promise<AllureResults> => {
  const testDir = join(__dirname, "fixtures", randomUUID());
  const configFileName = "jest.config.js";
  const configFilePath = join(testDir, configFileName);
  const testFileName = "sample.test.js";
  const testFilePath = join(testDir, testFileName);
  const configContent = `
    const config = {
      testEnvironment: require.resolve("allure-jest/node"),
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
  `;

  await step("create test dir", async () => {
    await mkdir(testDir, { recursive: true });
  });
  await step(configFileName, async () => {
    await writeFile(configFilePath, configContent, "utf8");
    await attachment(configFileName, configContent, {
      contentType: "text/plain",
      encoding: "utf-8",
      fileExtension: ".js",
    });
  });
  await step(testFileName, async () => {
    await writeFile(testFilePath, testContent, "utf8");
    await attachment(testFileName, testContent, {
      contentType: "text/plain",
      encoding: "utf-8",
      fileExtension: ".js",
    });
  });

  const modulePath = await step("resolve jest", () => {
    return require.resolve("jest-cli/bin/jest");
  });
  const args = ["--config", configFilePath, testDir];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
        ALLURE_TEST_MODE: "1",
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
