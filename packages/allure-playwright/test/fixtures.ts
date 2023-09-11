/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { fork } from "child_process";
import fs from "fs";
import path from "path";
import { test as base, TestInfo } from "@playwright/test";
import type { AllureResults } from "allure-js-commons";
import { parse } from "properties";
import { allure } from "../src";
export { expect } from "@playwright/test";

type RunResult = any;

type Files = { [key: string]: string | Buffer };
type Params = { [key: string]: string | number | boolean | string[] };
type Env = { [key: string]: string | number | boolean | undefined };

const writeFiles = async (testInfo: TestInfo, files: Files) => {
  const baseDir = testInfo.outputPath();

  const hasConfig = Object.keys(files).some((name) => name.includes(".config."));
  const reporterOptions = files.reporterOptions && JSON.parse(files.reporterOptions.toString());
  if (!hasConfig) {
    files = {
      ...files,
      "playwright.config.ts": `
        module.exports = {
          projects: [{ name: 'project' }],
          grep: require("../../dist/testplan.js").testPlanFilter(),
          reporter: [[require.resolve("../../dist/index.js"),
          ${JSON.stringify(reporterOptions || false)} || undefined], ["dot"]],
       };
      `,
    };
  }

  await Promise.all(
    Object.keys(files).map(async (name) => {
      const fullName = path.join(baseDir, name);
      await allure.attachment(name, Buffer.from(files[name]), "text/plain");
      await fs.promises.mkdir(path.dirname(fullName), { recursive: true });
      await fs.promises.writeFile(fullName, files[name]);
    }),
  );

  return baseDir;
};

const runPlaywrightTest = async (
  baseDir: string,
  params: any,
  env: Env,
): Promise<AllureResults> => {
  const paramList = [];
  let additionalArgs = "";
  for (const key of Object.keys(params)) {
    if (key === "args") {
      additionalArgs = params[key];
      continue;
    }
    for (const value of Array.isArray(params[key]) ? params[key] : [params[key]]) {
      const k = key.startsWith("-") ? key : `--${key}`;
      paramList.push(params[key] === true ? `${k}` : `${k}=${value}`);
    }
  }
  const outputDir = path.join(baseDir, "test-results");
  const args = ["test"];
  args.push(`--output=${outputDir}`, "--workers=2", ...paramList);

  if (additionalArgs) {
    args.push(...additionalArgs);
  }

  const modulePath = require.resolve("@playwright/test/lib/cli");
  await allure.logStep(`${modulePath} ${args.join(" ")}`);

  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
      ...env,
      PW_ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
    },
    cwd: baseDir,
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
        if (event.path === "environment.properties") {
          results.envInfo = parse(Buffer.from(event.data, "base64").toString());
        } else if (event.path === "categories.json") {
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
  return results;
};

type Fixtures = {
  runInlineTest: (files: Files, params?: Params, env?: Env) => Promise<AllureResults>;
  attachment: (name: string) => string;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  runInlineTest: async ({}, use, testInfo: TestInfo) => {
    let runResult: RunResult | undefined;
    await use(async (files: Files, params: Params = {}, env: Env = {}) => {
      const baseDir = await base.step("write files", async () => await writeFiles(testInfo, files));
      runResult = await base.step("run tests", async () => {
        const allureResults = await runPlaywrightTest(baseDir, params, env);
        await allure.attachment(
          "allure-results",
          Buffer.from(JSON.stringify(allureResults, null, 2)),
          "application/json",
        );
        return allureResults;
      });
      return runResult;
    });
    if (testInfo.status !== testInfo.expectedStatus && runResult && !process.env.PW_RUNNER_DEBUG) {
      // eslint-disable-next-line no-console
      console.error(runResult.output);
    }
  },
  // eslint-disable-next-line no-empty-pattern
  attachment: async ({}, use) => {
    await use((name) => path.join(__dirname, "assets", name));
  },
});
