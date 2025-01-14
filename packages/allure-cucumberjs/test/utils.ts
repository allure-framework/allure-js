import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { attachment, attachmentPath, logStep, step } from "allure-js-commons";
import type { AllureResults, TestPlanV1 } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

type CucumberRunOptions = {
  parallel?: boolean;
  testPlan?: TestPlanV1;
  env?: Record<string, string>;
  cwd?: string;
};

export const runCucumberInlineTest = async (
  features: string[],
  stepsDefs: string[],
  { parallel = true, testPlan, env, cwd }: CucumberRunOptions = {},
  configFactory?: (reporterPath: string) => string,
): Promise<AllureResults> => {
  const samplesPath = join(__dirname, "samples");
  const testDir = join(__dirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "config.js");
  const reporterFilePath = pathToFileURL(require.resolve("allure-cucumberjs/reporter")).toString();
  const featuresTempPath = join(testDir, "features");
  const supportTempPath = join(testDir, "features/support");
  const worldFilePath = join(supportTempPath, "world.js");
  const configContent = configFactory
    ? configFactory(reporterFilePath)
    : `
    module.exports = {
      default: {
        paths: ["./**/*.feature"],
        ${parallel ? "parallel: 4," : ""}
        format: ["summary", '"${reporterFilePath}":"ignore.txt"'],
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
          categories: [
            {
              name: "first"
            },
            {
              name: "second"
            }
          ],
        }
      }
    }
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
  await writeFile(join(testDir, "package.json"), String.raw`{"name": "dummy"}`, "utf8");
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
      const featureSrcPath = join(samplesPath, "features", `${feature}.feature`);
      const featureDstPath = join(featuresTempPath, `${feature}.feature`);
      const featureDstDir = dirname(featureDstPath);

      await mkdir(featureDstDir, { recursive: true });
      await copyFile(featureSrcPath, featureDstPath);
      await attachmentPath(`features/${feature}.feature`, featureSrcPath, { contentType: "text/plain" });
    });
  }

  for (const stepsDef of stepsDefs) {
    await step(`support/${stepsDef}.cjs`, async () => {
      const stepsDefPath = join(samplesPath, "support", `${stepsDef}.cjs`);
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
  const processCwd = cwd ? join(testDir, cwd) : testDir;
  const args = ["--config", relative(processCwd, configFilePath)];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ...finalEnv,
        ALLURE_TEST_MODE: "1",
      },
      cwd: processCwd,
      stdio: "pipe",
    });
  });

  const messageReader = new MessageReader();

  const stdout: string[] = [];
  const stderr: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  testProcess.on("message", messageReader.handleMessage);
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    const line = String(chunk);
    process.stdout.write(line);
    stdout.push(line);
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    const line = String(chunk);
    process.stderr.write(line);
    stderr.push(line);
  });

  return new Promise((resolve) => {
    testProcess.on("exit", async (code, signal) => {
      if (signal) {
        await logStep(`Interrupted with ${signal}`);
      }
      if (code) {
        await logStep(`Exit code: ${code}`);
      }
      await attachment("stdout", stdout.join("\n"), "text/plain");
      await attachment("stderr", stderr.join("\n"), "text/plain");
      await rm(testDir, { recursive: true });
      await messageReader.attachResults();
      return resolve(messageReader.results);
    });
  });
};
