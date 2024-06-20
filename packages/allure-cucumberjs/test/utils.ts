import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve as resolvePath } from "node:path";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runCucumberInlineTest = async (
  features: string[],
  stepsDefs: string[],
  parallel: boolean = true,
): Promise<AllureResults> => {
  const fixturesPath = join(__dirname, "fixtures");
  const testDir = join(__dirname, "fixtures/temp", randomUUID());
  const configFilePath = join(testDir, "config.js");
  const reporterFilePath = join(testDir, "reporter.js");
  const featuresTempPath = join(testDir, "features");
  const supportTempPath = join(testDir, "features/support");
  const worldFilePath = join(supportTempPath, "world.js");
  const configContent = `
    module.exports = {
      default: {
        ${parallel ? "parallel: 4," : ""}
        format: ["summary", "./reporter.js"],
        formatOptions: {
          testMode: true,
          labels: [
            {
              pattern: [/@feature:(.*)/],
              name: "feature",
            },
            {
              pattern: [/@severity:(.*)/],
              name: "severity",
            },
          ],
          links: {
            issue: {
              pattern: [/@issue=(.*)/],
              urlTemplate: "https://example.com/issues/%s",
            },
            tms: {
              pattern: [/@tms=(.*)/],
              urlTemplate: "https://example.com/tasks/%s",
            },
          },
        }
      }
    }
  `;
  const reporterContent = `
    const AllureCucumberReporter = require("allure-cucumberjs/reporter");

    module.exports = AllureCucumberReporter;
  `;
  const worldContent = `
    require("allure-cucumberjs");
  `;

  await mkdir(testDir, { recursive: true });
  await mkdir(supportTempPath, { recursive: true });
  await writeFile(configFilePath, configContent, "utf8");
  await writeFile(reporterFilePath, reporterContent, "utf8");
  await writeFile(worldFilePath, worldContent, "utf8");

  await Promise.all(
    features.map(async (feature) => {
      const featurePath = join(fixturesPath, "features", `${feature}.feature`);

      await copyFile(featurePath, join(featuresTempPath, `${feature}.feature`));
    }),
  );
  await Promise.all(
    stepsDefs.map(async (stepsDef) => {
      const stepsDefPath = join(fixturesPath, "support", `${stepsDef}.cjs`);
      const supportFilePath = join(supportTempPath, `${stepsDef}.js`);

      await mkdir(dirname(supportFilePath), { recursive: true });

      await copyFile(stepsDefPath, supportFilePath);
    }),
  );

  const modulePath = resolvePath(require.resolve("@cucumber/cucumber"), "../../bin/cucumber-js");
  const args = ["--config", "./config.js"];
  const testProcess = fork(modulePath, args, {
    env: {
      ...process.env,
    },
    cwd: testDir,
    stdio: "pipe",
  });

  const messageReader = new MessageReader();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  testProcess.on("message", messageReader.handleMessage);
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    process.stdout.write(String(chunk));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    process.stderr.write(String(chunk));
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async () => {
      await rm(testDir, { recursive: true });

      return resolve(messageReader.results);
    });
  });
};
