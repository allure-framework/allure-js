import { fork } from "child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { attachment, step } from "allure-js-commons";
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

  await step(`create test dir ${testDir}`, async () => {
    await mkdir(testDir, { recursive: true });
  });

  for (const file of Object.keys(testFiles)) {
    await step(file, async () => {
      const filePath = join(testDir, file);
      await mkdir(dirname(filePath), { recursive: true });
      const content = testFiles[file as keyof typeof testFiles];
      await writeFile(filePath, content, "utf8");
      await attachment(file, content, { contentType: "text/plain", fileExtension: extname(file), encoding: "utf-8" });
    });
  }

  const modulePath = require.resolve("@playwright/test/cli");
  const args = ["test", "-c", "./playwright.config.js", testDir, ...cliArgs];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ...env,
        ALLURE_TEST_MODE: "1",
        PW_DISABLE_TS_ESM: "1",
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
