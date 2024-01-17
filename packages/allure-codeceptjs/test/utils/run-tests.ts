import { fork } from "child_process";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { dirname, extname, resolve } from "path";
import type { AllureResults } from "allure-js-commons";
import { allure } from "allure-mocha/runtime";

const runTestsInternal = async (
  params: {
    files: Record<string, string>;
  },
  path: string,
): Promise<AllureResults> => {
  const configFile = "codecept.config.js";

  if (!(configFile in params.files)) {
    params.files[configFile] = await readFile(resolve(__dirname, "./default-codecept.config.js"), "utf-8");
  }

  const testPath = resolve(__dirname, `../../test-results/${path}`);

  await rm(testPath, {
    recursive: true,
    force: true,
  });

  await mkdir(testPath, {
    recursive: true,
  });

  await Promise.all(
    Object.keys(params.files).map(async (fileName) => {
      const filePath = resolve(testPath, fileName);
      const content = params.files[fileName];

      allure.attachment(fileName, content, {
        contentType: "text/plain",
        fileExtension: extname(fileName),
      });

      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content, {});
    }),
  );

  const modulePath = require.resolve("codeceptjs/bin/codecept.js");

  const args = ["run", "-c", testPath];
  allure.logStep(`${modulePath} ${args.join(" ")}`);

  const testProcess = fork(modulePath, args, {
    execArgv: [],
    env: {
      ...process.env,
      ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
    },
    cwd: testPath,
    stdio: "pipe",
  });

  const results: AllureResults = { tests: [], groups: [], attachments: {} };
  testProcess.on("message", (message) => {
    const event: { path: string; type: string; data: string } = JSON.parse(message.toString());

    switch (event.type) {
      case "result": {
        results.tests.push(JSON.parse(Buffer.from(event.data, "base64").toString()));
        break;
      }
      case "container": {
        results.groups.push(JSON.parse(Buffer.from(event.data, "base64").toString()));
        break;
      }
      case "attachment": {
        results.attachments[event.path] = event.data;
        break;
      }
      case "misc": {
        if (event.path === "categories.json") {
          results.categories = JSON.parse(Buffer.from(event.data, "base64").toString());
        }
      }
    }
  });

  testProcess.stdout?.on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  testProcess.stderr?.on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  await new Promise<number>((x) => testProcess.on("close", x));

  allure.attachment("allure-results", Buffer.from(JSON.stringify(results, null, 2)), "application/json");

  return results;
};
//
export const runTests: typeof runTestsInternal = (...args) => allure.step("run tests", () => runTestsInternal(...args));
// export const runTests: typeof runTestsInternal = (...args) => runTestsInternal(...args);
