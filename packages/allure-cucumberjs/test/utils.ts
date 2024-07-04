import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve as resolvePath } from "node:path";
import { attachment, attachmentPath, step } from "allure-js-commons";
import type { AllureResults, TestPlanV1 } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

export const runCucumberInlineTest = async (
  features: string[],
  stepsDefs: string[],
  parallel: boolean = true,
  testPlan?: TestPlanV1,
  env?: Record<string, string>,
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
          environmentInfo: {
            "app version": "123.0.1",
            "some other key": "some other value"
          },
          categories: [{
            name: "first"
          },{
            name: "second"
          }],
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

  await step(`create test dir ${testDir}`, async () => {
    await mkdir(testDir, { recursive: true });
  });
  await step(`create support temp dir ${supportTempPath}`, async () => {
    await mkdir(supportTempPath, { recursive: true });
  });
  await step("config.js", async () => {
    await writeFile(configFilePath, configContent, "utf8");
    await attachment("config.js", configContent, {
      contentType: "text/plain",
      encoding: "utf-8",
      fileExtension: ".js",
    });
  });
  await step("reporter.js", async () => {
    await writeFile(reporterFilePath, reporterContent, "utf8");
    await attachment("reporter.js", reporterContent, {
      contentType: "text/plain",
      encoding: "utf-8",
      fileExtension: ".js",
    });
  });
  await step("world.js", async () => {
    await writeFile(worldFilePath, worldContent, "utf8");
    await attachment("world.js", worldContent, {
      contentType: "text/plain",
      encoding: "utf-8",
      fileExtension: ".js",
    });
  });

  for (const feature of features) {
    await step(`features/${feature}.feature`, async () => {
      const featurePath = join(fixturesPath, "features", `${feature}.feature`);

      await copyFile(featurePath, join(featuresTempPath, `${feature}.feature`));
      await attachmentPath(`features/${feature}.feature`, featurePath, { contentType: "text/plain" });
    });
  }

  for (const stepsDef of stepsDefs) {
    await step(`support/${stepsDef}.cjs`, async () => {
      const stepsDefPath = join(fixturesPath, "support", `${stepsDef}.cjs`);
      const supportFilePath = join(supportTempPath, `${stepsDef}.js`);

      await mkdir(dirname(supportFilePath), { recursive: true });

      await copyFile(stepsDefPath, supportFilePath);
      await attachmentPath(`support/${stepsDef}.cjs`, stepsDefPath, { contentType: "text/plain" });
    });
  }

  const finalEnv: Record<string, string> = {
    ...env,
  };

  if (testPlan) {
    await step("testplan.json", async () => {
      const data = JSON.stringify(testPlan);
      const testPlanPath = join(testDir, "testplan.json");
      await writeFile(testPlanPath, data, "utf8");
      finalEnv.ALLURE_TESTPLAN_PATH = testPlanPath;
      await attachment("testplan.json", data, {
        contentType: "application/json",
        fileExtension: ".json",
      });
    });
  }

  const modulePath = await step("resolve @cucumber/cucumber", () => {
    return resolvePath(require.resolve("@cucumber/cucumber"), "../../bin/cucumber-js");
  });
  const args = ["--config", "./config.js"];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ...finalEnv,
        ALLURE_TEST_MODE: "1",
      },
      cwd: testDir,
      stdio: "pipe",
    });
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
      await messageReader.attachResults();
      return resolve(messageReader.results);
    });
  });
};
