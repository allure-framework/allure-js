import { TestInfo, test as base } from "@playwright/test";
import { fork } from "child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve as resolvePath } from "node:path";
import { AllureResults, TestResult, TestResultContainer } from "allure-js-commons/new/sdk/node";
import type { AllurePlaywrightReporterConfig } from "allure-playwright/reporter";

export const runPlaywrightInlineTest = async (test: string, config?: AllurePlaywrightReporterConfig, cliArgs: string[] = []): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const reporterBaseConfig = {
    resultsDir: "./allure-results",
    testMode: true,
  };
  const stringifiedConfig = JSON.stringify({
    ...reporterBaseConfig,
    ...config,
  })
  const testDir = join(__dirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "playwright.config.js");
  const testFilePath = join(testDir, "sample.test.js");
  const configContent = `
     module.exports = {
       reporter: [
         [
           require.resolve("allure-playwright/reporter"),
           ${stringifiedConfig},
         ],
         ["dot"],
       ],
       projects: [
         {
           name: "project",
         },
       ],
     };
  `

  await mkdir(testDir, { recursive: true });
  await writeFile(testFilePath, test, "utf8");
  await writeFile(configFilePath, configContent, "utf8");

  const modulePath = require.resolve("@playwright/test/cli");
  // const modulePath = resolvePath(moduleRootPath, "../bin/cypress");
  const args = ["test", "-c", "./playwright.config.js", "./sample.test.js", ...cliArgs];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
    },
    cwd: testDir,
    stdio: "pipe",
  });

  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });
  testProcess.on("message", (message: string) => {
    const event: { path: string; type: string; data: string } = JSON.parse(message);
    const data = event.type !== "attachment" ? JSON.parse(Buffer.from(event.data, "base64").toString()) : event.data;

    switch (event.type) {
      case "container":
        res.groups.push(data as TestResultContainer);
        break;
      case "result":
        res.tests.push(data as TestResult);
        break;
      case "attachment":
        console.log("attachment", event.data)
        res.attachments[event.path] = event.data;
        break;
      default:
        break;
    }
  });

  return new Promise((resolve, reject) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true });

      return resolve(res);
    });
  });
};
