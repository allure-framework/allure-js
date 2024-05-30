import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { copyFile, cp, mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { AllureResults } from "allure-js-commons/sdk";
import { MessageReader } from "allure-js-commons/sdk/reporter";

type MochaRunOptions = {
  env?: { [keys: string]: string };
  mode?: "serial" | "parallel";
};

export const runMochaInlineTest = async (
  sampleOrConfig: string | string[] | MochaRunOptions,
  ...samples: (string | string[])[]
): Promise<AllureResults> => {
  let options: MochaRunOptions;
  if (typeof sampleOrConfig === "object" && !(sampleOrConfig instanceof Array)) {
    options = sampleOrConfig;
  } else {
    samples = [sampleOrConfig, ...samples];
    options = {};
  }

  options.mode ??= process.env.ALLURE_MOCHA_TEST_PARALLEL ? "parallel" : "serial";

  const fixturesPath = path.join(__dirname, "fixtures");
  const samplesPath = path.join(fixturesPath, "samples");
  const runResultsDir = path.join(fixturesPath, "run-results");
  const testDir = path.join(runResultsDir, randomUUID());

  const reporterFileName = "reporter.cjs";
  const reporterSrcPath = path.join(fixturesPath, reporterFileName);
  const reporterDstPath = path.join(testDir, reporterFileName);

  const filesToCopy: [string, string][] = [[reporterSrcPath, reporterDstPath]];

  const mochaPackagePath = require.resolve("mocha");
  const mochaRunScriptPath = path.resolve(mochaPackagePath, "../bin/mocha.js");
  const mochaArgs = ["--no-color", "--reporter", "./reporter.cjs", "**/*.spec.mjs"];

  if (options.mode === "parallel") {
    const parallelSetupFileName = "setupParallel.cjs";
    const parallelSetupSrcPath = path.join(fixturesPath, parallelSetupFileName);
    const parallelSetupDstPath = path.join(testDir, parallelSetupFileName);

    const parallelWriterFileName = "AllureMochaParallelWriter.cjs";
    const parallelWriterSrcPath = path.join(fixturesPath, parallelWriterFileName);
    const parallelWriterDstPath = path.join(testDir, parallelWriterFileName);

    filesToCopy.push([parallelSetupSrcPath, parallelSetupDstPath], [parallelWriterSrcPath, parallelWriterDstPath]);
    mochaArgs.splice(1, 0, "--parallel", "--require", parallelSetupDstPath);
  }

  const cmdPath = path.join(testDir, "cmd.log");
  const cmdContent = [mochaRunScriptPath, ...mochaArgs].map((t) => `"${t}"`).join(" ");
  const stdoutPath = path.join(testDir, "stdout.log");
  const stderrPath = path.join(testDir, "stderr.log");

  await mkdir(testDir, { recursive: true });
  await Promise.all([
    ...filesToCopy.map(([src, dst]) => cp(src, dst)),
    writeFile(cmdPath, cmdContent, "utf-8"),
    ...samples.map(async (sample) => {
      if (sample instanceof Array) {
        sample = path.join(...sample);
      }
      const filename = `${sample}.spec.mjs`;
      const source = path.join(samplesPath, filename);
      const destination = path.join(testDir, filename);
      const destDir = path.dirname(destination);
      await mkdir(destDir, { recursive: true });
      await copyFile(source, destination);
    }),
  ]);

  const testProcess = fork(mochaRunScriptPath, mochaArgs, {
    env: {
      ...process.env,
      ...options.env,
      ALLURE_MOCHA_TESTHOST_PID: process.pid.toString(),
    },
    cwd: testDir,
    stdio: "pipe",
  });

  const messageReader = new MessageReader();

  testProcess.on("message", messageReader.handleMessage);

  testProcess.stdout?.setEncoding("utf8").on("data", (chunk: Buffer | string) => {
    appendFileSync(stdoutPath, chunk.toString());
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk: Buffer | string) => {
    appendFileSync(stderrPath, chunk.toString());
  });

  return new Promise<AllureResults>((resolve, reject) => {
    testProcess.on("exit", (code, signal) => {
      if ((code ?? -1) >= 0 && !signal) {
        resolve(messageReader.results);
      } else if (signal) {
        reject(new Error(`mocha was interrupted with ${signal}`));
      } else {
        reject(new Error(`mocha failed with exit code ${code || 1}`));
      }
    });
  });
};
