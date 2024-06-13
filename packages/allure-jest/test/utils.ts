import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runJestInlineTest = async (test: string): Promise<AllureResults> => {
  const testDir = join(__dirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "jest.config.js");
  const testFilePath = join(testDir, "sample.test.js");
  const configContent = `
    const config = {
      testEnvironment: require.resolve("allure-jest/node"),
      testEnvironmentOptions: {
        testMode: true,
        links: {
          issue: {
            urlTemplate: "https://example.org/issues/%s",
          },
          tms: {
            urlTemplate: "https://example.org/tasks/%s",
          }
        }
      },
    };

    module.exports = config;
  `;

  await mkdir(testDir, { recursive: true });
  await writeFile(configFilePath, configContent, "utf8");
  await writeFile(testFilePath, test, "utf8");

  const modulePath = require.resolve("jest-cli/bin/jest");
  const args = ["--config", configFilePath, testDir];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
      ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
    },
    cwd: testDir,
    stdio: "pipe",
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

      return resolve(messageReader.results);
    });
  });
};
