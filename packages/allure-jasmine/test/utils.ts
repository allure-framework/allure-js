import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runJasmineInlineTest = async (files: Record<string, string>): Promise<AllureResults> => {
  const testDir = join(__dirname, "temp", randomUUID());
  const testFiles = {
    "spec/support/jasmine.json": await readFile(join(__dirname, "./fixtures/spec/support/jasmine.json"), "utf8"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "spec/helpers/allure.js": require("./fixtures/spec/helpers/modern/allure.cjs"),
    ...files,
  };

  await mkdir(testDir, { recursive: true });

  for (const file of Object.keys(testFiles)) {
    const filePath = join(testDir, file);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, testFiles[file as keyof typeof testFiles] as string, "utf8");
  }

  const modulePath = require.resolve("jasmine/bin/jasmine");
  const args: string[] = [];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
    },
    cwd: testDir,
    stdio: "pipe",
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

      return resolve(messageReader.results);
    });
  });
};
