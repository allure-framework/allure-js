import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve as resolvePath } from "node:path";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";

export const runCypressInlineTest = async (
  test: (modulesPaths: { allureCommonsModulePath: string; allureCypressModulePath: string }) => string,
  externalConfigFactory?: (tempDir: string) => string,
  beforeTestCb?: (tempDir: string) => Promise<void>,
): Promise<AllureResults> => {
  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };
  const testDir = join(__dirname, "fixtures", randomUUID());
  const cypressTestsDir = join(testDir, "cypress/e2e");
  const cypressSupportDir = join(testDir, "cypress/support");
  const configFilePath = join(testDir, "cypress.config.js");
  const supportFilePath = join(cypressSupportDir, "e2e.js");
  const testFilePath = join(cypressTestsDir, "sample.cy.js");
  const configContent = externalConfigFactory
    ? externalConfigFactory(testDir)
    : `
    const { allureCypress } = require("allure-cypress/reporter");

    module.exports = {
      e2e: {
        baseUrl: "https://allurereport.org",
        viewportWidth: 1240,
        setupNodeEvents: (on, config) => {
          const reporter = allureCypress(on, {
            links: {
              issue: {
                urlTemplate: "https://allurereport.org/issues/%s"
              },
              tms: {
                urlTemplate: "https://allurereport.org/tasks/%s"
              },
            }
          });

          on("after:spec", (spec, result) => {
            reporter.endSpec(spec, result);
          });

          return config;
        },
      },
    };
  `;
  const supportContent = `
    import "allure-cypress";
  `;
  const allureCommonsModulePath = require.resolve("allure-js-commons");
  const allureCypressModulePath = require.resolve("allure-cypress");

  await mkdir(cypressTestsDir, { recursive: true });
  await mkdir(cypressSupportDir, { recursive: true });
  await writeFile(configFilePath, configContent, "utf8");
  await writeFile(supportFilePath, supportContent, "utf8");
  await writeFile(testFilePath, test({ allureCommonsModulePath, allureCypressModulePath }), "utf8");

  if (beforeTestCb) {
    await beforeTestCb(testDir);
  }

  const moduleRootPath = require.resolve("cypress");
  const modulePath = resolvePath(moduleRootPath, "../bin/cypress");
  const args = ["run", "-s", testFilePath];
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

  return new Promise((resolve) => {
    testProcess.on("exit", async () => {
      const testResultsDir = join(testDir, "allure-results");
      const resultFiles = await readdir(testResultsDir);

      for (const resultFile of resultFiles) {
        if (/-attachment\.\S+$/.test(resultFile)) {
          res.attachments[resultFile] = await readFile(join(testResultsDir, resultFile), "utf8");
          continue;
        }

        if (/-container\.json$/.test(resultFile)) {
          res.groups.push(JSON.parse(await readFile(join(testResultsDir, resultFile), "utf8")) as TestResultContainer);
          continue;
        }

        if (/-result\.json$/.test(resultFile)) {
          res.tests.push(JSON.parse(await readFile(join(testResultsDir, resultFile), "utf8")) as TestResult);
          continue;
        }
      }

      await rm(testDir, { recursive: true });

      return resolve(res);
    });
  });
};
