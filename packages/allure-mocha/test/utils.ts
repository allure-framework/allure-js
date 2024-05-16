import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { AllureResults, TestResult, TestResultContainer } from "allure-js-commons/sdk/node";

type MochaRunOptions = {
  env?: { [keys: string]: string };
};

export const runMochaInlineTest = async (
  sampleOrConfig: string | string[] | MochaRunOptions,
  ...samples: (string | string[])[]
) => {
  let options: MochaRunOptions;
  if (typeof sampleOrConfig === "object" && !(sampleOrConfig instanceof Array)) {
    options = sampleOrConfig;
  } else {
    samples = [sampleOrConfig, ...samples];
    options = {};
  }

  const res: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };

  const fixturesPath = path.join(__dirname, "fixtures");
  const samplesPath = path.join(fixturesPath, "samples");
  const runResultsDir = path.join(__dirname, "fixtures/run-results");
  const testDir = path.join(runResultsDir, randomUUID());

  const reporterPath = path.join(testDir, "reporter.cjs");
  const reporterContent = `
    const MochaAllureReporter = require('allure-mocha').default;
    const { MessageAllureWriter } = require("allure-js-commons/sdk/node");
    class ProcessMessageAllureReporter extends MochaAllureReporter {
      constructor(runner, opts) {
        if (opts.reporterOptions?.emitFiles !== 'true') {
          opts.reporterOptions = {
            writer: new MessageAllureWriter()
          };
        }
        super(runner, opts);
      }
    }
    module.exports = ProcessMessageAllureReporter;
  `;

  const mochaPackagePath = require.resolve("mocha");
  const mochaRunScriptPath = path.resolve(mochaPackagePath, "../bin/mocha.js");
  const mochaArgs = ["--no-color", "--reporter", "./reporter.cjs", "**/*.spec.mjs"];

  const cmdPath = path.join(testDir, "cmd.log");
  const cmdContent = [mochaRunScriptPath, ...mochaArgs].map((t) => `"${t}"`).join(" ");
  const stdoutPath = path.join(testDir, "stdout.log");
  const stderrPath = path.join(testDir, "stderr.log");

  await mkdir(testDir, { recursive: true });
  await Promise.all([
    writeFile(reporterPath, reporterContent, "utf-8"),
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
    },
    cwd: testDir,
    stdio: "pipe",
  });

  testProcess.on("message", (message: string) => {
    const event: { path: string; type: string; data: string } = JSON.parse(message);
    const data = event.type !== "attachment" ? JSON.parse(Buffer.from(event.data, "base64").toString()) : event.data;

    switch (event.type) {
      case "container":
        res.groups.push(data as TestResultContainer);
        break;
      case "result":
        res.tests.push(data as TestResult);
        break;
      case "attachment":
        res.attachments[event.path] = event.data;
        break;
      default:
        break;
    }
  });

  testProcess.stdout?.setEncoding("utf8").on("data", (chunk: Buffer | string) => {
    appendFileSync(stdoutPath, chunk.toString());
  });
  testProcess.stderr?.setEncoding("utf8").on("data", (chunk: Buffer | string) => {
    appendFileSync(stderrPath, chunk.toString());
  });

  return new Promise<AllureResults>((resolve, reject) => {
    testProcess.on("exit", (code, signal) => {
      if ((code ?? -1) >= 0 && !signal) {
        resolve(res);
      } else if (signal) {
        reject(new Error(`mocha was interrupted with ${signal}`));
      } else {
        reject(new Error(`mocha failed with exit code ${code || 1}`));
      }
    });
  });
};
