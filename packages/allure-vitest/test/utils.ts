import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "url";
import { attachment, logStep, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { stripAnsi } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

type Opts = {
  env?: Record<string, string>;
};

const fileDirname = dirname(fileURLToPath(import.meta.url));

export const runVitestInlineTest = async (
  test: string,
  externalConfigFactory?: (tempDir: string) => string,
  beforeTestCb?: (tempDir: string) => Promise<void>,
  opts: Opts = {},
): Promise<AllureResults> => {
  const testDir = join(fileDirname, "fixtures", randomUUID());
  const configFilePath = join(testDir, "vitest.config.ts");
  const testFilePath = join(testDir, "sample.test.ts");
  const configContent = externalConfigFactory
    ? externalConfigFactory(testDir)
    : `
    import { defineConfig } from "vitest/config";

    export default defineConfig({
      test: {
        setupFiles: ["${require.resolve("allure-vitest/setup")}"],
        reporters: [
          "verbose",
          ["${require.resolve("allure-vitest/reporter")}", {
            links: {
              issue: {
                urlTemplate: "https://example.org/issue/%s",
              },
              tms: {
                urlTemplate: "https://example.org/tms/%s",
              },
            },
            resultsDir: "${join(testDir, "allure-results")}",
          }]
        ],
      },
    });
  `;

  await step("create testDir", async () => {
    await mkdir(testDir, { recursive: true });
  });
  await step(`write config file ${configFilePath}`, async () => {
    await writeFile(configFilePath, configContent, "utf8");
    await attachment("vitest.config.ts", configContent, {
      contentType: "text/plain",
      fileExtension: ".ts",
      encoding: "utf-8",
    });
  });

  await step(`write test file ${testFilePath}`, async () => {
    await writeFile(testFilePath, test, "utf8");
    await attachment(basename(testFilePath), test, {
      contentType: "text/plain",
      fileExtension: extname(testFilePath),
      encoding: "utf-8",
    });
  });

  if (beforeTestCb) {
    await beforeTestCb(testDir);
  }

  const { env = {} } = opts;

  const modulePath = require.resolve("vitest/dist/cli-wrapper.js");
  const args = ["run", "--config", configFilePath, "--dir", testDir];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    return fork(modulePath, args, {
      env: {
        ...process.env,
        ...env,
        ALLURE_TEST_MODE: "1",
      },
      cwd: testDir,
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
