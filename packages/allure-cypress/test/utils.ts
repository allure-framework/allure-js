import { type ChildProcess, fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve as resolvePath } from "node:path";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import { ContentType, attachment, step } from "allure-js-commons";
import type { AllureResults, EnvironmentInfo } from "allure-js-commons/sdk";
import { parseProperties } from "allure-js-commons/sdk/reporter";

type CypressModulesPaths = {
  allureCommonsModulePath: string;
  allureCypressModulePath: string;
  allureCypressModuleBasePath: string;
};

type CypressTestFiles = Record<string, (modulesPaths: CypressModulesPaths) => string>;

type AllureResultsWithTimestamps = AllureResults & {
  timestamps: Map<string, Date>;
};

export const runCypressInlineTest = async (
  testFiles: CypressTestFiles,
  env?: (testDir: string) => Record<string, string>,
): Promise<AllureResultsWithTimestamps> => {
  const res: AllureResultsWithTimestamps = {
    tests: [],
    groups: [],
    attachments: {},
    categories: [],
    envInfo: undefined,
    timestamps: new Map(),
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
            allureCypress(on, config, {
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

  await step("Prepare files", async () => {
    // eslint-disable-next-line guard-for-in
    for (const testFile in testFilesToWrite) {
      await mkdir(dirname(join(testDir, testFile)), { recursive: true });
      const content = testFilesToWrite[testFile]({
        allureCommonsModulePath,
        allureCypressModulePath,
        allureCypressModuleBasePath,
      });
      await writeFile(join(testDir, testFile), content, "utf8");
      await attachment(testFile, content, ContentType.TEXT);
    }
  });

  const stdout: string[] = [];
  const stderr: string[] = [];

  let setTestProcess: (value: ChildProcess | PromiseLike<ChildProcess>) => void;
  const testProcessPromise = new Promise<ChildProcess>((resolve) => {
    setTestProcess = resolve;
  });
  const testProcessStep = step("Run Cypress process", async (ctx) => {
    const moduleRootPath = require.resolve("cypress");
    const modulePath = resolvePath(moduleRootPath, "../bin/cypress");
    await ctx.parameter("Module", modulePath);

    const args = ["run", "--browser", "chrome", "-q"];
    await ctx.parameter("Arguments", JSON.stringify(args));

    const envVars = env?.(testDir);
    if (envVars) {
      await attachment("Extra environment variables", JSON.stringify(envVars), ContentType.JSON);
    }

    await ctx.parameter("CWD", testDir);

    const testProcess = fork(modulePath, args, {
      env: {
        ...process.env,
        ...envVars,
      },
      cwd: testDir,
      stdio: "pipe",
    });

    testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
      stdout.push(String(chunk));
    });
    testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
      stderr.push(String(chunk));
    });

    setTestProcess(testProcess);

    await new Promise<void>((resolve) =>
      testProcess.on("exit", async (code, signal) => {
        if (typeof code === "number") {
          await ctx.parameter("Exit code", code.toString());
        }
        if (signal) {
          await ctx.parameter("Interrupted by", signal);
        }
        await attachment("stdout", stdout.join("\n"), ContentType.TEXT);
        await attachment("stderr", stderr.join("\n"), ContentType.TEXT);
        resolve();
      }),
    );
  });

  return new Promise((resolve, reject) =>
    testProcessPromise.then((testProcess) => {
      testProcess.on("exit", async () => {
        try {
          await testProcessStep;

          await step("Parse Allure results", async () => {
            const testResultsDir = join(testDir, "allure-results");
            try {
              const resultFiles = await readdir(testResultsDir);

              for (const resultFile of resultFiles) {
                const fullPath = join(testResultsDir, resultFile);

                if (resultFile === "categories.json") {
                  const categories = JSON.parse(await readFile(fullPath, "utf8"));
                  await attachment(resultFile, JSON.stringify(categories, undefined, 2), ContentType.JSON);
                  res.categories = categories;
                  continue;
                }

                if (resultFile === "environment.properties") {
                  const content = await readFile(fullPath, "utf8");
                  await attachment(resultFile, content, ContentType.TEXT);
                  res.envInfo = parseProperties(content) as EnvironmentInfo;
                  continue;
                }

                if (/-attachment\.\S+$/.test(resultFile)) {
                  const content = await readFile(fullPath, "utf8");
                  await attachment(resultFile, content, ContentType.TEXT);
                  res.attachments[resultFile] = content;
                  continue;
                }

                if (/-container\.json$/.test(resultFile)) {
                  const testResultContainer = JSON.parse(await readFile(fullPath, "utf8")) as TestResultContainer;
                  await attachment(resultFile, JSON.stringify(testResultContainer, undefined, 2), ContentType.JSON);
                  res.groups.push(testResultContainer);
                  continue;
                }

                if (/-result\.json$/.test(resultFile)) {
                  const testResult = JSON.parse(await readFile(fullPath, "utf8")) as TestResult;
                  await attachment(resultFile, JSON.stringify(testResult, undefined, 2), ContentType.JSON);
                  res.tests.push(testResult);
                  const fileStat = await stat(fullPath);
                  res.timestamps.set(testResult.uuid, fileStat.ctime);
                  continue;
                }
              }
            } catch (e) {
              if (!(e instanceof Error && "code" in e && e.code === "ENOENT")) {
                throw e;
              }
            }
          });

          await rm(testDir, { recursive: true });

          return resolve(res);
        } catch (err) {
          await rm(testDir, { recursive: true });

          return reject(err);
        }
      });
    }),
  );
};
