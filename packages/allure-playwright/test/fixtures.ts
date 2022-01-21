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

import { test as base, TestInfo } from "@playwright/test";
import type { InMemoryAllureWriter } from "allure-js-commons";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
export { expect } from "@playwright/test";

type RunResult = any;

type Files = { [key: string]: string | Buffer };
type Params = { [key: string]: string | number | boolean | string[] };
type Env = { [key: string]: string | number | boolean | undefined };

async function writeFiles(testInfo: TestInfo, files: Files) {
  const baseDir = testInfo.outputPath();

  const hasConfig = Object.keys(files).some((name) => name.includes(".config."));
  if (!hasConfig) {
    files = {
      ...files,
      "playwright.config.ts": `
        module.exports = { projects: [ { name: 'project' } ] };
      `,
    };
  }

  await Promise.all(
    Object.keys(files).map(async (name) => {
      const fullName = path.join(baseDir, name);
      await fs.promises.mkdir(path.dirname(fullName), { recursive: true });
      await fs.promises.writeFile(fullName, files[name]);
    }),
  );

  return baseDir;
}

async function runPlaywrightTest(
  baseDir: string,
  postProcess: (writer: InMemoryAllureWriter) => any,
  params: any,
  env: NodeJS.ProcessEnv,
): Promise<RunResult> {
  const paramList = [];
  let additionalArgs = "";
  for (const key of Object.keys(params)) {
    if (key === "args") {
      additionalArgs = params[key];
      continue;
    }
    for (const value of Array.isArray(params[key]) ? params[key] : [params[key]]) {
      const k = key.startsWith("-") ? key : "--" + key;
      paramList.push(params[key] === true ? `${k}` : `${k}=${value}`);
    }
  }
  const outputDir = path.join(baseDir, "test-results");
  const args = [require.resolve("@playwright/test/cli"), "test"];
  args.push(
    "--output=" + outputDir,
    "--reporter=" + require.resolve("../dist/index.js"),
    "--workers=2",
    ...paramList,
  );
  if (additionalArgs) args.push(...additionalArgs);
  const testProcess = spawn("node", args, {
    env: {
      ...process.env,
      ...env,
      PW_ALLURE_POST_PROCESSOR_FOR_TEST: String(postProcess),
    },
    cwd: baseDir,
  });
  let output = "";
  testProcess.stdout.on("data", (chunk) => {
    output += String(chunk);
    if (process.env.PW_RUNNER_DEBUG) process.stdout.write(String(chunk));
  });
  testProcess.stderr.on("data", (chunk) => {
    if (process.env.PW_RUNNER_DEBUG) process.stderr.write(String(chunk));
  });
  await new Promise<number>((x) => testProcess.on("close", x));
  return JSON.parse(output.toString());
}

type Fixtures = {
  runInlineTest: (
    files: Files,
    postProcess: (writer: InMemoryAllureWriter) => any,
    params?: Params,
    env?: Env,
  ) => Promise<RunResult>;
};

export const test = base.extend<Fixtures>({
  // @ts-ignore
  runInlineTest: async ({}, use, testInfo: TestInfo) => {
    let runResult: RunResult | undefined;
    await use(
      // @ts-ignore
      async (files: Files, postProcess, params: Params = {}, env: NodeJS.ProcessEnv = {}) => {
        const baseDir = await writeFiles(testInfo, files);
        runResult = await runPlaywrightTest(baseDir, postProcess, params, env);
        return runResult;
      },
    );
    if (testInfo.status !== testInfo.expectedStatus && runResult && !process.env.PW_RUNNER_DEBUG)
      console.log(runResult.output);
  },
});
