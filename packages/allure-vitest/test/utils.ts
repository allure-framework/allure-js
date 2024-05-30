import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

const fileDirname = dirname(fileURLToPath(import.meta.url));

export const runVitestInlineTest = async (
  test: string,
  externalConfigFactory?: (tempDir: string) => string,
  beforeTestCb?: (tempDir: string) => Promise<void>,
): Promise<AllureResults> => {
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "vitest.config.ts");
  const testFilePath = join(testDir, "sample.test.ts");
  const configContent = externalConfigFactory
    ? externalConfigFactory(testDir)
    : `
    import AllureReporter from "allure-vitest/reporter";
    import { defineConfig } from "vitest/config";

    export default defineConfig({
      test: {
        setupFiles: ["allure-vitest/setup"],
        reporters: [
          "default",
          new AllureReporter({
            testMode: true,
            links: [
              {
                type: "issue",
                urlTemplate: "https://example.org/issue/%s",
              },
              {
                type: "tms",
                urlTemplate: "https://example.org/tms/%s",
              },
            ],
            resultsDir: "${join(testDir, "allure-results")}",
          }),
        ],
      },
    });
  `;

  await mkdir(testDir, { recursive: true });
  await writeFile(configFilePath, configContent, "utf8");
  await writeFile(testFilePath, test, "utf8");

  if (beforeTestCb) {
    await beforeTestCb(testDir);
  }

  const modulePath = require.resolve("vitest/dist/cli-wrapper.js");
  const args = ["run", "--config", configFilePath, "--dir", testDir];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
    },
    cwd: testDir,
    stdio: "pipe",
  });

  const messageReader = new MessageReader();
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
