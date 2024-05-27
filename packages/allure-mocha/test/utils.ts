import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { AllureResults, TestResult, TestResultContainer } from "allure-js-commons/sdk/node";

type MochaRunOptions = {
  env?: { [keys: string]: string };
};
type ModuleFormat = "cjs" | "esm";

const getFormatExt = (format: ModuleFormat) => (format === "cjs" ? ".cjs" : ".mjs");

export const SPEC_FORMAT: ModuleFormat = process.env.ALLURE_MOCHA_TEST_SPEC_FORMAT === "cjs" ? "cjs" : "esm";
export const RUNNER: "cli" | ModuleFormat =
  process.env.ALLURE_MOCHA_TEST_RUNNER === "cjs"
    ? "cjs"
    : process.env.ALLURE_MOCHA_TEST_RUNNER === "esm"
      ? "esm"
      : "cli";
export const SPEC_EXT = getFormatExt(SPEC_FORMAT);
export const RUN_IN_PARALLEL = !!process.env.ALLURE_MOCHA_TEST_PARALLEL;

const uncommentPattern = new Map<ModuleFormat, RegExp>([
  ["cjs", /\/\/ cjs: ([^\r\n]+)/g],
  ["esm", /\/\/ esm: ([^\r\n]+)/g],
]);

abstract class AllureMochaTestRunner {
  readonly fixturesPath: string;
  readonly samplesPath: string;
  readonly runResultsDir: string;
  constructor(private readonly config: MochaRunOptions) {
    this.fixturesPath = path.join(__dirname, "fixtures");
    this.samplesPath = path.join(this.fixturesPath, "samples");
    this.runResultsDir = path.join(this.fixturesPath, "run-results");
  }

  run = async (...samples: readonly (string | readonly string[])[]) => {
    const res: AllureResults = {
      tests: [],
      groups: [],
      attachments: {},
    };
    const testDir = path.join(this.runResultsDir, randomUUID());

    const filesToCopy = [...this.getFilesToCopy(testDir)];
    const filesToTransform = [
      ...this.getFilesToTransform(testDir),
      ...samples.map((sample) => this.getSampleEntry(sample, this.samplesPath, testDir)),
    ];
    const scriptArgs = this.getScriptArgs();

    if (RUN_IN_PARALLEL) {
      const setupParallelCopyEntry = this.getCopyEntry("setupParallel.cjs", testDir);
      filesToCopy.push(setupParallelCopyEntry, this.getCopyEntry("AllureMochaParallelWriter.cjs", testDir));
      scriptArgs.push("--parallel");
      if (RUNNER === "cli") {
        scriptArgs.push("--require", setupParallelCopyEntry[1]);
      }
    }

    const scriptPath = this.getScriptPath(testDir);
    const cmdPath = path.join(testDir, "cmd.log");
    const cmdContent = [scriptPath, ...scriptArgs].join("\n  ");

    await mkdir(testDir, { recursive: true });
    await Promise.all([
      ...filesToCopy.map(async ([src, dst]) => {
        const dstDir = path.dirname(dst);
        await mkdir(dstDir, { recursive: true });
        await copyFile(src, dst);
      }),
      ...filesToTransform.map(async ([src, dst, uncomment]) => {
        const dstDir = path.dirname(dst);
        const content = await readFile(src, { encoding: "utf-8" });
        await mkdir(dstDir, { recursive: true });
        const uncommentedSample = content.replaceAll(uncomment, "$1");
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        writeFile(dst, uncommentedSample, { encoding: "utf-8" });
      }),
      writeFile(cmdPath, cmdContent, "utf-8"),
    ]);

    const testProcess = fork(scriptPath, scriptArgs, {
      env: {
        ...process.env,
        ...this.config.env,
        ALLURE_MOCHA_TESTHOST_PID: process.pid.toString(),
      },
      cwd: testDir,
      stdio: "pipe",
    });

    testProcess.on("message", (message: string) => {
      const event: { path: string; type: string; data: string } = JSON.parse(message);
      const data =
        event.type === "attachment"
          ? event.data
          : event.type === "misc" && event.path === "environment.properties"
            ? Buffer.from(event.data, "base64").toString()
            : JSON.parse(Buffer.from(event.data, "base64").toString());

      switch (event.type) {
        case "container":
          res.groups.push(data as TestResultContainer);
          break;
        case "result":
          res.tests.push(data as TestResult);
          break;
        case "attachment":
          res.attachments[event.path] = data;
          break;
        case "misc":
          if (event.path === "environment.properties") {
            // @ts-ignore
            res.envInfo = data;
          } else if (event.path === "categories.json") {
            // @ts-ignore
            res.categories = data;
          }
        default:
          break;
      }
    });

    const stdoutPath = path.join(testDir, "stdout.log");
    const stderrPath = path.join(testDir, "stderr.log");
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

  protected getCopyEntry = (name: string, testDir: string): [string, string] => [
    path.join(this.fixturesPath, name),
    path.join(testDir, name),
  ];

  protected getTransformEntry = (
    name: string,
    format: ModuleFormat,
    testDir: string,
    srcDir: string = this.fixturesPath,
  ): [string, string, RegExp] => {
    return [
      path.join(srcDir, `${name}.js`),
      path.join(testDir, `${name}${getFormatExt(format)}`),
      uncommentPattern.get(format)!,
    ];
  };

  private getSampleEntry = (name: string | readonly string[], samplesDir: string, testDir: string) => {
    if (name instanceof Array) {
      name = path.join(...name);
    }
    return this.getTransformEntry(`${name}.spec`, SPEC_FORMAT, testDir, samplesDir);
  };

  getFilesToCopy: (testDir: string) => readonly [string, string][] = () => [];
  getFilesToTransform: (testDir: string) => readonly [string, string, RegExp][] = () => [];
  abstract getScriptPath: (testDir: string) => string;
  abstract getScriptArgs: () => string[];
}

class AllureMochaCliTestRunner extends AllureMochaTestRunner {
  getFilesToCopy = (testDir: string) => [this.getCopyEntry("reporter.cjs", testDir)];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  getScriptPath = () => path.resolve(require.resolve("mocha"), "../bin/mocha.js");
  getScriptArgs = () => ["--no-color", "--reporter", "./reporter.cjs", "**/*.spec.*"];
}

class AllureMochaCodeTestRunner extends AllureMochaTestRunner {
  constructor(
    config: MochaRunOptions,
    private readonly runnerFormat: ModuleFormat,
  ) {
    super(config);
  }
  getFilesToTransform = (testDir: string) => [this.getTransformEntry("runner", this.runnerFormat, testDir)];
  getScriptPath = (testDir: string) => path.join(testDir, `runner${getFormatExt(this.runnerFormat)}`);
  getScriptArgs = () => ["--"];
}

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

  const runner =
    RUNNER === "cli" ? new AllureMochaCliTestRunner(options) : new AllureMochaCodeTestRunner(options, RUNNER);
  return await runner.run(...samples);
};
