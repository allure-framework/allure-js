import { fork } from "child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runPlaywrightInlineTest = async (
  files: Record<string, string | Buffer>,
  cliArgs: string[] = [],
  env?: Record<string, string>,
): Promise<AllureResults> => {
  const testFiles = {
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
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
