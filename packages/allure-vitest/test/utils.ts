import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rmdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";
import type { TestResult, TestResultContainer } from "allure-js-commons";

const fileDirname = dirname(fileURLToPath(import.meta.url));

interface RunResults {
  results: TestResult[];
  containers: TestResultContainer[];
}

export const runVitestInlineTest = async (test: string): Promise<RunResults> => {
  const res: RunResults = {
    results: [] as TestResult[],
    containers: [] as TestResultContainer[],
    // attachments: [] as atta
  };
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "vitest.config.ts");
  const testFilePath = join(testDir, "sample.test.ts");

  await mkdir(testDir, { recursive: true });
  await writeFile(
    configFilePath,
    `
      import AllureReporter from "allure-vitest";
      import { defineConfig } from "vitest/config";

      export default defineConfig({
        test: {
          reporters: [
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
            }),
          ],
        },
      });
    `,
  );
  await writeFile(testFilePath, test, "utf8");

  const modulePath = require.resolve("vitest/dist/cli-wrapper.js");
  const args = ["run", "--config", configFilePath, "--dir", testDir];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
      ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
    },
    cwd: testDir,
  });

  testProcess.on("message", (message: string) => {
    const event: { path: string; type: string; data: string } = JSON.parse(message);
    const data = JSON.parse(Buffer.from(event.data, "base64").toString());

    switch (event.type) {
      case "container":
        res.containers.push(data as TestResultContainer);
        break;
      case "result":
        res.results.push(data as TestResult);
        break;
      case "attachment":
        // TODO:
        break;
      default:
        break;
    }
  });

  return new Promise((resolve, reject) => {
    testProcess.on("exit", async (code) => {
      await rmdir(testDir, { recursive: true });

      if (code === 0) {
        return resolve(res);
      }

      return reject();
    });
  });
};
