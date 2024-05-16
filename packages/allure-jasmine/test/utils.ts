import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parse } from "properties";
import {
  AllureResults,
  EnvironmentInfo,
  LinkType,
  Status,
  TestResult,
  TestResultContainer,
} from "allure-js-commons/new/sdk/node";

export type TestResultsByFullName = Record<string, TestResult>;

const parseJsonResult = <T>(data: string) => {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as T;
};

export const runJasmineInlineTest = async (files: Record<string, string>): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testDir = join(__dirname, "fixtures", randomUUID());
  const testFiles = {
    "spec/support/jasmine.json": `
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
    `,
    "spec/helpers/allure.js": `
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
    `,
    ...files,
  };

  await mkdir(testDir, { recursive: true });

  for (const file of Object.keys(testFiles)) {
    const filePath = join(testDir, file);

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, testFiles[file as keyof typeof testFiles], "utf8");
  }

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
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true });

      return resolve(res);
    });
  });
};
