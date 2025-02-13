import { fork } from "child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { attachment, logStep, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

type AllurePlaywrightTestResults = AllureResults & { restFiles: Record<string, string> };

export const runPlaywrightInlineTest = async (
  files: Record<string, string | Buffer>,
  cliArgs: string[] = [],
  env?: Record<string, string>,
): Promise<AllurePlaywrightTestResults> => {
  const testFiles = {
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             "allure-playwright",
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
  const testFilesNames = Object.keys(testFiles);
  const testDir = join(__dirname, "fixtures", randomUUID());

  await step(`create test dir ${testDir}`, async () => {
    await mkdir(testDir, { recursive: true });
  });

  for (const file of testFilesNames) {
    await step(file, async () => {
      const filePath = join(testDir, file);
      await mkdir(dirname(filePath), { recursive: true });
      const content = testFiles[file as keyof typeof testFiles];
      await writeFile(filePath, content, "utf8");
      await attachment(file, content, {
        contentType: "text/plain",
        fileExtension: extname(file),
        encoding: "utf-8",
      });
    });
  }

  const modulePath = require.resolve("@playwright/test/cli");
  const args = ["test", "-c", "./playwright.config.js", ...cliArgs];
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

  const stdout: string[] = [];
  const stderr: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  testProcess.on("message", messageReader.handleMessage);
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    stdout.push(String(chunk));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    stderr.push(String(chunk));
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async (code, signal) => {
      const resultsFiles = (await readdir(testDir)).filter((filename) => !testFilesNames.includes(filename));

      if (signal) {
        await logStep(`Interrupted with ${signal}`);
      }
      if (code) {
        await logStep(`Exit code: ${code}`);
      }

      await attachment("stdout", stdout.join("\n"), "text/plain");
      await attachment("stderr", stderr.join("\n"), "text/plain");
      await messageReader.attachResults();

      const result: AllurePlaywrightTestResults = {
        ...messageReader.results,
        restFiles: {},
      };

      for (const file of resultsFiles) {
        const content = await readFile(join(testDir, file), "utf-8");

        result.restFiles[file] = content;
      }

      await rm(testDir, { recursive: true });

      return resolve(result);
    });
  });
};
