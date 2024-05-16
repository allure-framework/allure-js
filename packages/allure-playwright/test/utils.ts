import { fork } from "child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse } from "properties";
import { AllureResults, EnvironmentInfo, TestResult, TestResultContainer } from "allure-js-commons/sdk/node";

const parseJsonResult = <T>(data: string) => {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as T;
};

export const runPlaywrightInlineTest = async (
  files: Record<string, string | Buffer>,
  cliArgs: string[] = [],
  env?: Record<string, string>,
): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testFiles = {
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright/reporter"),
             {
               resultsDir: "./allure-results",
               testMode: true,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
    ...files,
  };
  const testDir = join(__dirname, "fixtures", randomUUID());

  await mkdir(testDir, { recursive: true });

  for (const file of Object.keys(testFiles)) {
    const filePath = join(testDir, file);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, testFiles[file as keyof typeof testFiles], "utf8");
  }

  const modulePath = require.resolve("@playwright/test/cli");
  const args = ["test", "-c", "./playwright.config.js", testDir, ...cliArgs];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
      ...env,
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

    switch (event.type) {
      case "container":
        res.groups.push(parseJsonResult<TestResultContainer>(event.data));
        break;
      case "result":
        res.tests.push(parseJsonResult<TestResult>(event.data));
        break;
      case "attachment":
        res.attachments[event.path] = event.data;
        break;
      case "misc":
        res.envInfo =
          event.path === "environment.properties"
            ? (parse(Buffer.from(event.data, "base64").toString()) as EnvironmentInfo)
            : undefined;
        res.categories = event.path === "categories.json" ? parseJsonResult(event.data) : undefined;
        break;
      default:
        break;
    }
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true });

      return resolve(res);
    });
  });
};
