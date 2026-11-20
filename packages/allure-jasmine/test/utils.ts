import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { attachment, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

interface JasmineRunResults extends AllureResults {
  exitCode: number | null;
}

export const runJasmineInlineTest = async (
  files: Record<string, string>,
  env?: Record<string, string>,
  { parallel }: { parallel?: number } = {},
): Promise<JasmineRunResults> => {
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
  const args = parallel ? [`--parallel=${parallel}`] : [];
  const childEnv = { ...process.env };
  delete childEnv.ALLURE_TESTPLAN_PATH;
  delete childEnv.ALLURE_RERUN;

  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...childEnv,
        ...env,
        // Jasmine owns the workers' IPC channel. Parallel runs use the real writer.
        ALLURE_TEST_MODE: parallel ? "" : "1",
      },
      cwd: testDir,
      silent: true,
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

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    testProcess.on("error", reject);
    testProcess.on("exit", resolve);
  });

  if (parallel) {
    const resultsDir = path.join(testDir, "allure-results");
    // An early runner error may prevent the results directory from being created.
    const resultFiles = await readdir(resultsDir).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    });
    for (const file of resultFiles) {
      const type = file.endsWith("-result.json")
        ? "result"
        : file.endsWith("-container.json")
          ? "container"
          : file.endsWith("-globals.json")
            ? "globals"
            : file === "environment.properties" || file === "categories.json"
              ? "misc"
              : "attachment";
      const data = await readFile(path.join(resultsDir, file));
      messageReader.handleMessage(JSON.stringify({ path: file, type, data: data.toString("base64") }));
    }
  }

  await rm(testDir, { recursive: true });
  await messageReader.attachResults();
  if (stdout.length) {
    await attachment("stdout", stdout.join("\n"), { contentType: "text/plain" });
  }
  if (stderr.length) {
    await attachment("stderr", stderr.join("\n"), { contentType: "text/plain" });
  }
  return { ...messageReader.results, exitCode };
};
