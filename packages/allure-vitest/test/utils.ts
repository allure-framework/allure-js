import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "url";
import { MessageReader, getPosixPath } from "../../allure-js-commons/src/sdk/reporter/index.js";
import { attachment, logStep, step } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { stripAnsi } from "allure-js-commons/sdk";

export type TestFileAccessor = (opts: {
  setupModulePath: string;
  reporterModulePath: string;
  allureResultsPath: string;
  testDir: string;
}) => string;

export type TestFiles = Record<string, string | TestFileAccessor>;

type Opts = {
  env?: (testDir: string) => Record<string, string>;
  cwd?: string;
};

const fileDirname = dirname(fileURLToPath(import.meta.url));

export const setupModulePath = getPosixPath(require.resolve("allure-vitest/setup"));

export const browserSetupModulePath = getPosixPath(require.resolve("allure-vitest/browser/setup"));

export const reporterModulePath = getPosixPath(require.resolve("allure-vitest/reporter"));

export const createVitestConfig = (allureResultsPath: string) => `
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      openTelemetry: {
        enabled: false,
      },
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

export const createVitestBrowserConfig = (allureResultsPath: string) => `
  import { defineConfig } from "vitest/config";
  import { commands } from "allure-vitest/browser"
  import { playwright } from "@vitest/browser-playwright";

  export default defineConfig({
    test: {
      openTelemetry: {
        enabled: false,
      },
      setupFiles: ["${browserSetupModulePath}"],
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
      browser: {
        provider: playwright(),
        enabled: true,
        headless: true,
        instances: [
          { browser: "chromium" },
        ],
        commands: {
          ...commands,
        }
      },
    },
  });
`;

export const runVitestInlineTest = async (
  testFiles: TestFiles,
  { env = () => ({}), cwd }: Opts = {},
): Promise<AllureResults> => {
  const testDir = join(fileDirname, "fixtures", randomUUID());
  // getPosixPath allows us to interpolate such paths without escaping
  const allureResultsPath = getPosixPath(join(testDir, "allure-results"));
  const fixtureAccessorOpts = {
    setupModulePath,
    reporterModulePath,
    allureResultsPath,
    testDir,
  };

  const testFilesToWrite: TestFiles = {
    "vitest.config.ts": createVitestConfig(allureResultsPath),
    "package.json": JSON.stringify({ name: "dummy" }),
    ...testFiles,
  };

  await step("create test dir", async () => {
    await mkdir(testDir, { recursive: true });
  });

  // eslint-disable-next-line guard-for-in
  for (const testFile in testFilesToWrite) {
    // add ability to skip writing files such as config
    if (!testFilesToWrite[testFile]) {
      continue;
    }

    await step(`write test file "${testFile}"`, async () => {
      const testFilePath = join(testDir, testFile);
      let testFileContent: string;

      if (typeof testFilesToWrite[testFile] === "string") {
        testFileContent = testFilesToWrite[testFile] as string;
      } else {
        testFileContent = (testFilesToWrite[testFile] as TestFileAccessor)(fixtureAccessorOpts);
      }

      await mkdir(dirname(testFilePath), { recursive: true });
      await writeFile(testFilePath, testFileContent, "utf8");
      await attachment(testFile, testFileContent, {
        contentType: "text/plain",
        encoding: "utf-8",
        fileExtension: extname(testFile),
      });
    });
  }

  const modulePath = await step("resolve vitest", () => {
    const vitestPath = dirname(require.resolve("vitest"));

    return join(vitestPath, "vitest.mjs");
  });
  const args = ["run", "--config", join(testDir, "vitest.config.ts"), "--dir", "."];
  const testProcess = await step(`${modulePath} ${args.join(" ")}`, () => {
    const subprocessEnv: Record<string, string> = {
      ...process.env,
      ALLURE_TEST_MODE: "1",
      ...(env?.(testDir) ?? {}),
    };

    return fork(modulePath, args, {
      env: { ...subprocessEnv },
      cwd: cwd ? join(testDir, cwd) : testDir,
      stdio: ["inherit", "pipe"],
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
