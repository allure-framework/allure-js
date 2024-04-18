import { TestInfo, test as base } from "@playwright/test";
import { fork } from "child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve as resolvePath } from "node:path";
import { AllureResults, TestResult, TestResultContainer } from "allure-js-commons/new/sdk/node";

// import properties from "properties";
// import { attachment } from "allure-playwright/helpers";

// export { expect } from "@playwright/test";

// type RunResult = any;
//
// type Files = { [key: string]: string | Buffer };
// type Params = { [key: string]: string | number | boolean | string[] };
// type Env = { [key: string]: string | number | boolean | undefined };

// const writeFiles = async (testInfo: TestInfo, files: Files) => {
//   const baseDir = testInfo.outputPath();
//   const hasConfig = Object.keys(files).some((name) => name.includes(".config."));
//   const reporterOptions = files.reporterOptions && JSON.parse(files.reporterOptions.toString());
//
//   if (!hasConfig) {
//     files = {
//       ...files,
//       "playwright.config.ts": `
//         module.exports = {
//           projects: [{ name: 'project' }],
//           grep: require("allure-playwright/testplan").testPlanFilter(),
//           reporter: [[require.resolve("../../dist/index.cjs"),
//           ${JSON.stringify(reporterOptions || false)} || undefined], ["dot"]],
//        };
//       `,
//     };
//   }
//
//   await Promise.all(
//     Object.keys(files).map(async (name) => {
//       const fullName = join(baseDir, name);
//       await attachment(name, Buffer.from(files[name]), "text/plain");
//       await mkdir(dirname(fullName), { recursive: true });
//       await writeFile(fullName, files[name]);
//     }),
//   );
//
//   return baseDir;
// };
//
// const runPlaywrightTest = async (baseDir: string, params: any, env: Env): Promise<AllureResults> => {
//   const paramList = [];
//   let additionalArgs = "";
//   for (const key of Object.keys(params)) {
//     if (key === "args") {
//       additionalArgs = params[key];
//       continue;
//     }
//     for (const value of Array.isArray(params[key]) ? params[key] : [params[key]]) {
//       const k = key.startsWith("-") ? key : `--${key}`;
//       paramList.push(params[key] === true ? `${k}` : `${k}=${value}`);
//     }
//   }
//   const outputDir = join(baseDir, "test-results");
//   const args = ["test"];
//   args.push(`--output=${outputDir}`, "--workers=2", ...paramList);
//
//   if (additionalArgs) {
//     args.push(additionalArgs);
//   }
//
//   const modulePath = require.resolve("@playwright/test/cli");
//   // TODO:
//   // await allure.logStep(`${modulePath} ${args.join(" ")}`);
//
//   const testProcess = fork(modulePath, args, {
//     env: {
//       ...process.env,
//       ...env,
//       PW_ALLURE_POST_PROCESSOR_FOR_TEST: String("true"),
//     },
//     cwd: baseDir,
//     stdio: "pipe",
//   });
//   const results: AllureResults = { tests: [], groups: [], attachments: {} };
//   testProcess.on("message", (message) => {
//     const event: { path: string; type: string; data: string } = JSON.parse(message.toString());
//
//     switch (event.type) {
//       case "result": {
//         results.tests.push(JSON.parse(Buffer.from(event.data, "base64").toString()));
//         break;
//       }
//       case "container": {
//         results.groups.push(JSON.parse(Buffer.from(event.data, "base64").toString()));
//         break;
//       }
//       case "attachment": {
//         results.attachments[event.path] = event.data;
//         break;
//       }
//       case "misc": {
//         if (event.path === "environment.properties") {
//           results.envInfo = properties.parse(Buffer.from(event.data, "base64").toString());
//         } else if (event.path === "categories.json") {
//           results.categories = JSON.parse(Buffer.from(event.data, "base64").toString());
//         }
//       }
//     }
//   });
//   testProcess.stdout?.on("data", (chunk) => {
//     process.stdout.write(String(chunk));
//   });
//   testProcess.stderr?.on("data", (chunk) => {
//     process.stderr.write(String(chunk));
//   });
//   await new Promise<number>((x) => testProcess.on("close", x));
//   return results;
// };
//
// type Fixtures = {
//   runInlineTest: (files: Files, params?: Params, env?: Env) => Promise<AllureResults>;
//   attachment: (name: string) => string;
// };
//
// export const test = base.extend<Fixtures>({
//   // eslint-disable-next-line no-empty-pattern
//   runInlineTest: async ({}, use, testInfo: TestInfo) => {
//     let runResult: RunResult | undefined;
//     await use(async (files: Files, params: Params = {}, env: Env = {}) => {
//       const baseDir = await base.step("write files", async () => await writeFiles(testInfo, files));
//       runResult = await base.step("run tests", async () => {
//         const allureResults = await runPlaywrightTest(baseDir, params, env);
//         await attachment("allure-results", Buffer.from(JSON.stringify(allureResults, null, 2)), "application/json");
//         return allureResults;
//       });
//       return runResult;
//     });
//     if (testInfo.status !== testInfo.expectedStatus && runResult && !process.env.PW_RUNNER_DEBUG) {
//       // eslint-disable-next-line no-console
//       console.error(runResult.output);
//     }
//   },
//   // eslint-disable-next-line no-empty-pattern
//   attachment: async ({}, use) => {
//     await use((name) => join(__dirname, "assets", name));
//   },
// });

export const runPlaywrightInlineTest = async (test: string): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testDir = join(__dirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "playwright.config.js");
  const testFilePath = join(testDir, "sample.test.js");
  const configContent = `
     module.exports = {
       reporter: [
         [
           require.resolve("allure-playwright"),
           {
             resultsDir: "./allure-results",
             testMode: true,
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
  `

  await mkdir(testDir, { recursive: true });
  await writeFile(testFilePath, test, "utf8");
  await writeFile(configFilePath, configContent, "utf8");

  const modulePath = require.resolve("@playwright/test/cli");
  // const modulePath = resolvePath(moduleRootPath, "../bin/cypress");
  const args = ["test", "-c", "./playwright.config.js", "./sample.test.js"];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
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
    const data = event.type !== "attachment" ? JSON.parse(Buffer.from(event.data, "base64").toString()) : event.data;

    switch (event.type) {
      case "container":
        res.groups.push(data as TestResultContainer);
        break;
      case "result":
        res.tests.push(data as TestResult);
        break;
      case "attachment":
        res.attachments[event.path] = event.data;
        break;
      default:
        break;
    }
  });

  return new Promise((resolve, reject) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true });

      return resolve(res);
    });
  });
};
