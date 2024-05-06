import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AllureResults, TestResult, TestResultContainer } from "allure-js-commons";
import { LinkType, Status } from "allure-js-commons/new/sdk/node";
import { parse } from "properties";

export type TestResultsByFullName = Record<string, TestResult>;

const parseJsonResult = <T>(data: string) => {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8"));
};

export const runJasmineInlineTest = async (test: string): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testDir = join(__dirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "spec/support/jasmine.json");
  const helperFilePath = join(testDir, "spec/helpers/allure.js");
  const testFilePath = join(testDir, "spec/test/sample.spec.js");
  const configContent = `
    {
      "spec_dir": "spec",
      "spec_files": [
        "**/*[sS]pec.?(m)js"
      ],
      "helpers": [
        "helpers/**/*.?(m)js"
      ],
      "env": {
        "stopSpecOnExpectationFailure": false,
        "random": true
      }
    }
  `;
  const helperContent = `
    const AllureJasmineReporter = require("allure-jasmine");

    const reporter = new AllureJasmineReporter({
      testMode: true,
      links: [
        {
          type: "${LinkType.ISSUE}",
          urlTemplate: "https://example.org/issues/%s",
        },
        {
          type: "${LinkType.TMS}",
          urlTemplate: "https://example.org/tasks/%s",
        }
      ],
      categories: [
        {
          name: "Sad tests",
          messageRegex: /.*Sad.*/,
          matchedStatuses: ["${Status.FAILED}"],
        },
        {
          name: "Infrastructure problems",
          messageRegex: ".*RuntimeException.*",
          matchedStatuses: ["${Status.BROKEN}"],
        },
        {
          name: "Outdated tests",
          messageRegex: ".*FileNotFound.*",
          matchedStatuses: ["${Status.BROKEN}"],
        },
        {
          name: "Regression",
          messageRegex: ".*\\sException:.*",
          matchedStatuses: ["${Status.BROKEN}"],
        },
      ],
      environmentInfo: {
        envVar1: "envVar1Value",
        envVar2: "envVar2Value",
      },
    });

    jasmine.getEnv().addReporter(reporter);
  `;
  await mkdir(testDir, { recursive: true });
  await mkdir(join(testDir, "spec/support"), { recursive: true });
  await mkdir(join(testDir, "spec/helpers"), { recursive: true });
  await mkdir(join(testDir, "spec/test"), { recursive: true });

  await writeFile(configFilePath, configContent, "utf8");
  await writeFile(helperFilePath, helperContent, "utf8");
  await writeFile(testFilePath, test, "utf8");

  const modulePath = require.resolve("jasmine/bin/jasmine");
  const args: string[] = [];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
      ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
    },
    cwd: testDir,
    stdio: "pipe",
  });
  let processError = "";

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
          event.path === "environment.properties" ? parse(Buffer.from(event.data, "base64").toString()) : undefined;
        res.categories = event.path === "categories.json" ? parseJsonResult(event.data) : undefined;
        break;
      default:
        break;
    }
  });
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    process.stderr.write(String(chunk));
    processError += chunk;
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true });

      return resolve(res);
    });
  });
};
