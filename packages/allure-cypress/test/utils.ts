import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve as resolvePath } from "node:path";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import type { AllureResults, EnvironmentInfo } from "allure-js-commons/sdk";
import { parseProperties } from "allure-js-commons/sdk/reporter";

type CypressModulesPaths = {
  allureCommonsModulePath: string;
  allureCypressModulePath: string;
  allureCypressModuleBasePath: string;
};

type CypressTestFiles = Record<string, (modulesPaths: CypressModulesPaths) => string>;

export const runCypressInlineTest = async (
  testFiles: CypressTestFiles,
  env?: (testDir: string) => Record<string, string>,
): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
    categories: [],
    envInfo: undefined,
  };
  const testDir = join(__dirname, "fixtures", randomUUID());
  const allureCypressModuleBasePath = dirname(require.resolve("allure-cypress"));
  const allureCommonsModulePath = require.resolve("allure-js-commons");
  const allureCypressModulePath = require.resolve("allure-cypress");
  const testFilesToWrite: CypressTestFiles = {
    "cypress/support/e2e.js": () => `
      require("${allureCypressModuleBasePath}/index.js");
    `,
    "cypress.config.js": () => `
      const { allureCypress } = require("${allureCypressModuleBasePath}/reporter.js");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            allureCypress(on, {
              links: {
                issue: {
                  urlTemplate: "https://allurereport.org/issues/%s"
                },
                tms: {
                  urlTemplate: "https://allurereport.org/tasks/%s"
                },
              },
            });

            return config;
          },
        },
      };
    `,
    ...testFiles,
  };

  // eslint-disable-next-line guard-for-in
  for (const testFile in testFilesToWrite) {
    await mkdir(dirname(join(testDir, testFile)), { recursive: true });
    await writeFile(
      join(testDir, testFile),
      testFilesToWrite[testFile]({
        allureCommonsModulePath,
        allureCypressModulePath,
        allureCypressModuleBasePath,
      }),
      "utf8",
    );
  }

  const moduleRootPath = require.resolve("cypress");
  const modulePath = resolvePath(moduleRootPath, "../bin/cypress");
  const args = ["run", "--browser", "chrome", "-q"];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
      ...env?.(testDir),
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

  return new Promise((resolve, reject) => {
    testProcess.on("exit", async () => {
      try {
        const testResultsDir = join(testDir, "allure-results");
        const resultFiles = await readdir(testResultsDir);

        for (const resultFile of resultFiles) {
          if (resultFile === "categories.json") {
            res.categories = JSON.parse(await readFile(join(testResultsDir, resultFile), "utf8"));
            continue;
          }

          if (resultFile === "environment.properties") {
            res.envInfo = parseProperties(await readFile(join(testResultsDir, resultFile), "utf8")) as EnvironmentInfo;
            continue;
          }

          if (/-attachment\.\S+$/.test(resultFile)) {
            res.attachments[resultFile] = await readFile(join(testResultsDir, resultFile), "utf8");
            continue;
          }

          if (/-container\.json$/.test(resultFile)) {
            res.groups.push(
              JSON.parse(await readFile(join(testResultsDir, resultFile), "utf8")) as TestResultContainer,
            );
            continue;
          }

          if (/-result\.json$/.test(resultFile)) {
            res.tests.push(JSON.parse(await readFile(join(testResultsDir, resultFile), "utf8")) as TestResult);
            continue;
          }
        }

        await rm(testDir, { recursive: true });

        return resolve(res);
      } catch (err) {
        return reject(err);
      }
    });
  });
};
