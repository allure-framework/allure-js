import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "url";
import { attachment, logStep, step } from "allure-js-commons";
import type { AllureResults, TestPlanV1 } from "allure-js-commons/sdk";
import { stripAnsi } from "allure-js-commons/sdk";
import { MessageReader, getPosixPath } from "allure-js-commons/sdk/reporter";

type Opts = {
  env?: Record<string, string>;
  specPath?: string;
  testplan?: TestPlanV1;
  configFactory?: (tempDir: string) => string;
  cwd?: string;
};

const fileDirname = dirname(fileURLToPath(import.meta.url));

export const runVitestInlineTest = async (
  test: string,
  { env = {}, specPath = "sample.test.ts", testplan, configFactory, cwd }: Opts = {},
): Promise<AllureResults> => {
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "vitest.config.ts");
  const testFilePath = join(testDir, specPath);

  // getPosixPath allows us to interpolate such paths without escaping
  const setupModulePath = getPosixPath(require.resolve("allure-vitest/setup"));
  const reporterModulePath = getPosixPath(require.resolve("allure-vitest/reporter"));
  const allureResultsPath = getPosixPath(join(testDir, "allure-results"));

  const configContent = configFactory
    ? configFactory(testDir)
    : `
    import { defineConfig } from "vitest/config";

    export default defineConfig({
      test: {
        setupFiles: ["${setupModulePath}"],
        reporters: [
          "verbose",
          ["${reporterModulePath}", {
            links: {
              issue: {
                urlTemplate: "https://example.org/issue/%s",
              },
              tms: {
                urlTemplate: "https://example.org/tms/%s",
              },
            },
            resultsDir: "${allureResultsPath}",
          }]
        ],
      },
    });
  `;

  await step("create testDir", async () => {
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, "package.json"), String.raw`{ "name": "dummy" }`);
  });
  await step(`write config file ${configFilePath}`, async () => {
    await writeFile(configFilePath, configContent, "utf8");
    await attachment("vitest.config.ts", configContent, {
      contentType: "text/plain",
      fileExtension: ".ts",
      encoding: "utf-8",
    });
  });

  if (testplan) {
    await step("write testplan.json", async () => {
      const testPlanPath = join(testDir, "testplan.json");
      await writeFile(testPlanPath, JSON.stringify(testplan));
      env.ALLURE_TESTPLAN_PATH = testPlanPath;
    });
  }

  await step(`write test file ${testFilePath}`, async () => {
    const specDir = dirname(testFilePath);
    await mkdir(specDir, { recursive: true });
    await writeFile(testFilePath, test, "utf8");
    await attachment(basename(testFilePath), test, {
      contentType: "text/plain",
      fileExtension: extname(testFilePath),
      encoding: "utf-8",
    });
  });

  const modulePath = require.resolve("vitest/dist/cli.js");
  const args = ["run", "--config", configFilePath, "--dir", testDir];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ...env,
        ALLURE_TEST_MODE: "1",
      },
      cwd: cwd ? join(testDir, cwd) : testDir,
      stdio: "pipe",
    });
  });

  const messageReader = new MessageReader();
  const stdout: string[] = [];
  const stderr: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  testProcess.on("message", messageReader.handleMessage);
  testProcess.stdout?.setEncoding("utf8").on("data", (chunk) => {
    stdout.push(stripAnsi(String(chunk)));
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk) => {
    stderr.push(stripAnsi(String(chunk)));
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
