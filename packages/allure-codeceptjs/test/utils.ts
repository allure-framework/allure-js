import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dirname, resolve as resolvePath } from "node:path";
import type { AllureResults, TestResult, TestResultContainer } from "allure-js-commons/new/sdk/node";

const parseJsonResult = <T>(data: string) => {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as T;
};

export const runCodeceptJSInlineTest = async (
  files: Record<string, string | Buffer>,
  env?: Record<string, string>,
): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testFiles = {
    "codecept.conf.js": await readFile(resolvePath(__dirname, "./assets/codecept.conf.js"), "utf-8"),
    "helper.js": await readFile(resolvePath(__dirname, "./assets/helper.js"), "utf-8"),
    ...files,
  };
  const testDir = join(__dirname, "fixtures", randomUUID());

  await mkdir(testDir, { recursive: true });

  for (const file of Object.keys(testFiles)) {
    const filePath = join(testDir, file);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, testFiles[file as keyof typeof testFiles], "utf8");
  }

  const modulePath = require.resolve("codeceptjs/bin/codecept.js");
  const args = ["run", "-c", testDir];
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
