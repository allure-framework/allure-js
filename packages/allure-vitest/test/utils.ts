import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";
import type { AllureResults, TestResult, TestResultContainer } from "allure-js-commons";

const fileDirname = dirname(fileURLToPath(import.meta.url));

export const runVitestInlineTest = async (
  test: string,
  config?: (cwd: string) => string,
): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "vitest.config.ts");
  const testFilePath = join(testDir, "sample.test.ts");
  const configContent = config
    ? config(testDir)
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
              resultsDir: "${join(testDir, "allure-results")}",
            }),
          ],
        },
      });
  `;

  await mkdir(testDir, { recursive: true });
  await writeFile(configFilePath, configContent, "utf8");
  await writeFile(testFilePath, test, "utf8");

  const modulePath = require.resolve("vitest/dist/cli-wrapper.js");
  const args = ["run", "--config", configFilePath, "--dir", testDir];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
      ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
    },
    cwd: testDir,
    stdio: "pipe",
  });

  testProcess.on("message", (message: string) => {
    const event: { path: string; type: string; data: string } = JSON.parse(message);
    const data =
      event.type !== "attachment"
        ? JSON.parse(Buffer.from(event.data, "base64").toString())
        : event.data;

    switch (event.type) {
      case "container":
        res.groups.push(data as TestResultContainer);
        break;
      case "result":
        res.tests.push(data as TestResult);
        break;
      case "attachment":
        res.attachments[event.path] = event.data;
        break;
      default:
        break;
    }
  });
  testProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  testProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  return new Promise((resolve, reject) => {
    testProcess.on("close", async (code) => {
      await rm(testDir, { recursive: true });

      if (code === 0) {
        return resolve(res);
      }

      return reject();
    });
  });
};
