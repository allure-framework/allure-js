import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rmdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";
import type { AllureResults, Attachment, TestResult, TestResultContainer } from "allure-js-commons";

const fileDirname = dirname(fileURLToPath(import.meta.url));

interface RunResults {
  results: TestResult[];
  containers: TestResultContainer[];
  attachments: Attachment[];
}

export const runVitestInlineTest = async (test: string): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "vitest.config.ts");
  const testFilePath = join(testDir, "sample.test.ts");

  await mkdir(testDir, { recursive: true });
  // TODO: make possible to pass custom conf
  await writeFile(
    configFilePath,
    `
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
      await rmdir(testDir, { recursive: true });

      if (code === 0) {
        return resolve(res);
      }

      return reject();
    });
  });
};
