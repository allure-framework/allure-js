import { type ChildProcess, fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve as resolvePath } from "node:path";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import { ContentType, attachment, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { getPosixPath, parseEnvInfo } from "allure-js-commons/sdk/reporter";

type AllureCypressPaths = {
  allureCommonsModulePath: string;
  allureCypressModulePath: string;
  allureCypressReporterModulePath: string;
  supportFilePath: string;
  specPattern: string;
  allureDirPath: string;
};

type CypressTestFiles = Record<string, (modulesPaths: AllureCypressPaths) => string>;

type AllureResultsWithTimestamps = AllureResults & {
  timestamps: Map<string, Date>;
};

type CypressRunOptions = {
  env?: (testDir: string) => Record<string, string>;
  cwd?: string;
};

export const runCypressInlineTest = async (
  testFiles: CypressTestFiles,
  { env, cwd }: CypressRunOptions = {},
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
  const processCwd = cwd ? join(testDir, cwd) : testDir;
  const configFilePath = relative(processCwd, join(testDir, "cypress.config.js"));

  const testFilesToWrite: CypressTestFiles = {
    "package.json": () => String.raw`{"name": "dummy"}`,
    "cypress/support/e2e.js": ({ allureCypressModulePath }) => `
      require("${allureCypressModulePath}");
    `,
    "cypress.config.js": ({ allureCypressReporterModulePath, supportFilePath, specPattern, allureDirPath }) => `
      const { allureCypress } = require("${allureCypressReporterModulePath}");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          supportFile: "${supportFilePath}",
          specPattern: "${specPattern}",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            allureCypress(on, config, {
              resultsDir: "${allureDirPath}",
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
    const allureCommonsModulePath = require.resolve("allure-js-commons");
    const allureCypressModulePath = require.resolve("allure-cypress");
    const allureCypressReporterModulePath = require.resolve("allure-cypress/reporter");

    // eslint-disable-next-line guard-for-in
    for (const testFile in testFilesToWrite) {
      const fileDir = dirname(join(testDir, testFile));
      await mkdir(fileDir, { recursive: true });
      const content = testFilesToWrite[testFile]({
        allureCommonsModulePath: getPosixPath(relative(fileDir, allureCommonsModulePath)),
        allureCypressModulePath: getPosixPath(relative(fileDir, allureCypressModulePath)),
        allureCypressReporterModulePath: getPosixPath(relative(fileDir, allureCypressReporterModulePath)),
        supportFilePath: getPosixPath(relative(processCwd, join(testDir, "cypress/support/e2e.js"))),
        specPattern: getPosixPath(relative(processCwd, join(testDir, "cypress/e2e/**/*.cy.{js,jsx,ts,tsx}"))),
        allureDirPath: getPosixPath(join(testDir, "allure-results")),
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

    const args = ["run", "-q", "--config-file", configFilePath];
    await ctx.parameter("Arguments", JSON.stringify(args));

    const envVars = env?.(testDir);
    if (envVars) {
      await attachment("Extra environment variables", JSON.stringify(envVars), ContentType.JSON);
    }

    await ctx.parameter("CWD", processCwd);

    const testProcess = fork(modulePath, args, {
      env: {
        ...process.env,
        ...envVars,
      },
      cwd: processCwd,
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
        if (code !== 0) {
          stdout.forEach((out) => process.stdout.write(out));
          stderr.forEach((out) => process.stderr.write(out));
        }

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
                  res.envInfo = parseEnvInfo(content);
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
