import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { attachment, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runJasmineInlineTest = async (
  files: Record<string, string>,
  env?: Record<string, string>,
): Promise<AllureResults> => {
  const testDir = path.join(__dirname, "fixtures", randomUUID());
  const testFiles = {
    // package.json is used to find project root in case of absolute file paths are used
    "package.json": '{ "name": "dummy"}',
    "spec/support/jasmine.json": await readFile(path.join(__dirname, "./samples/spec/support/jasmine.json"), "utf8"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    "spec/helpers/allure.js": require("./samples/spec/helpers/modern/allure.cjs"),
    ...files,
  };

  await mkdir(testDir, { recursive: true });

  for (const file of Object.keys(testFiles)) {
    await step(file, async () => {
      const filePath = path.join(testDir, file);

      await mkdir(path.dirname(filePath), { recursive: true });
      const content: string = testFiles[file as keyof typeof testFiles];
      await writeFile(filePath, content, "utf8");
      await attachment(file, content, {
        encoding: "utf-8",
        contentType: "text/plain",
        fileExtension: path.extname(file),
      });
    });
  }

  const modulePath = await step("resolve jasmine", () =>
    path.resolve(require.resolve("jasmine"), "../../bin/jasmine.js"),
  );
  const args: string[] = [];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ...env,
        ALLURE_TEST_MODE: "1",
      },
      cwd: testDir,
      stdio: "pipe",
    });
  });

  const messageReader = new MessageReader();

  const stdout: string[] = [];
  const stderr: string[] = [];
  testProcess.on("message", messageReader.handleMessage);
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    const str = String(chunk);
    process.stdout.write(str);
    stdout.push(str);
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    const str = String(chunk);
    process.stderr.write(str);
    stderr.push(str);
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true });
      await messageReader.attachResults();
      if (stdout.length) {
        await attachment("stdout", stdout.join("\n"), { contentType: "text/plain" });
      }
      if (stderr.length) {
        await attachment("stderr", stderr.join("\n"), { contentType: "text/plain" });
      }
      return resolve(messageReader.results);
    });
  });
};
