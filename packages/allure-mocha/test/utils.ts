import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { type Label, Status, attachment, attachmentPath, logStep, parameter, step } from "allure-js-commons";
import type { AllureResults, Category } from "allure-js-commons/sdk";
import { MessageReader, getPosixPath } from "allure-js-commons/sdk/reporter";
import type { AllureMochaReporterConfig } from "../src/types.js";

type MochaRunOptions = {
  env?: { [keys: string]: string };
  testplan?: readonly TestPlanEntryFixture[];
  environmentInfo?: { [keys: string]: string };
  categories?: readonly Category[];
  extraReporters?: AllureMochaReporterConfig["extraReporters"];
  inputFiles?: string[];
  outputFiles?: Record<string, string>;
  globalLabels?: Label[];
};

type TestPlanEntryFixture = {
  id?: string | number;
  selector?: TestPlanSelectorEntryFixture;
};

type AllureMochaRunResults = AllureResults & {
  outputFiles: Map<string, Buffer>;
  exitCode: number;
  stdout: string[];
  stderr: string[];
};

type TestPlanSelectorEntryFixture = [file: readonly string[], name: string];

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

type MochaError = { message: string; stack: string };

class AllureMochaMessageReader extends MessageReader {
  private readonly errors: MochaError[] = [];
  handleCustomMessage = (type: string, data: any) => {
    if (type === "error") {
      this.errors.push(data as MochaError);
    }
  };
  attachErrors = async () => {
    if (this.errors.length) {
      await step("Errors", async () => {
        for (const error of this.errors) {
          await logStep(error.message, Status.FAILED, error as Error);
        }
      });
    }
  };
}

abstract class AllureMochaTestRunner {
  readonly samplesPath: string;
  readonly specsPath: string;
  readonly runResultsDir: string;

  constructor(protected readonly config: MochaRunOptions) {
    this.samplesPath = path.join(__dirname, "samples");
    this.specsPath = path.join(this.samplesPath, "spec");
    this.runResultsDir = path.join(__dirname, "fixtures");
  }

  run = async (...samples: readonly (string | readonly string[])[]) => {
    // TODO parameter should accept any type
    await parameter("parallel", `${RUN_IN_PARALLEL}`);
    await parameter("module", SPEC_FORMAT);
    await parameter("runner", RUNNER);

    const testDir = path.join(this.runResultsDir, randomUUID());

    const filesToCopy = [
      ...this.getFilesToCopy(testDir),
      ...(this.config.inputFiles?.map((f) => this.getCopyEntry(f, testDir)) ?? []),
    ];
    const filesToTransform = [
      ...this.getFilesToTransform(testDir),
      ...samples.map((sample) => this.#getSampleEntry(sample, this.specsPath, testDir)),
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
    for (const [src, dst] of filesToCopy) {
      const name = path.basename(dst);
      await step(name, async () => {
        const dstDir = path.dirname(dst);
        await mkdir(dstDir, { recursive: true });
        await copyFile(src, dst);
        await attachmentPath(name, src, { contentType: "text/plain" });
      });
    }

    for (const [src, dst, uncomment] of filesToTransform) {
      const name = path.basename(dst);
      await step(name, async () => {
        const dstDir = path.dirname(dst);
        const content = await readFile(src, { encoding: "utf-8" });
        await mkdir(dstDir, { recursive: true });
        const uncommentedSample = content.replace(uncomment, "$1");
        await writeFile(dst, uncommentedSample, { encoding: "utf-8" });
        await attachment(name, uncommentedSample, { contentType: "text/plain" });
      });
    }

    await step(path.basename(cmdPath), async () => {
      await writeFile(cmdPath, cmdContent, "utf-8");
    });

    if (this.config.testplan) {
      const testplanPath = path.join(testDir, "testplan.json");
      this.config.env ??= {};
      this.config.env.ALLURE_TESTPLAN_PATH = testplanPath;
      const selectorPrefix = path.relative(path.join(__dirname, ".."), testDir);
      const content = JSON.stringify({
        version: "1.0",
        tests: this.config.testplan.map((test) => ({
          id: test.id,
          selector: test.selector ? this.#resolveTestplanSelector(selectorPrefix, test.selector) : undefined,
        })),
      });
      await writeFile(testplanPath, content, { encoding: "utf-8" });
      await attachment(path.basename(testplanPath), content, {
        contentType: "application/json",
        fileExtension: "json",
      });
    }

    const testProcess = await step(`${scriptPath} ${scriptArgs.join(" ")}`, () => {
      return fork(scriptPath, scriptArgs, {
        env: {
          ...process.env,
          ...this.config.env,
          ALLURE_MOCHA_TESTHOST_PID: process.pid.toString(),
          ALLURE_TEST_MODE: "1",
        },
        cwd: testDir,
        stdio: "pipe",
      });
    });

    const messageReader = new AllureMochaMessageReader();

    testProcess.on("message", messageReader.handleMessage);

    const stdout: string[] = [];
    const stderr: string[] = [];
    testProcess.stdout?.setEncoding("utf8").on("data", (chunk: Buffer | string) => {
      stdout.push(chunk.toString());
    });
    testProcess.stderr?.setEncoding("utf8").on("data", (chunk: Buffer | string) => {
      stderr.push(chunk.toString());
    });

    return await new Promise<AllureMochaRunResults>((resolve, reject) => {
      testProcess.on("exit", async (code, signal) => {
        if (stdout.length) {
          await attachment("stdout", stdout.join("\n"), "text/plain");
        }
        if (stderr.length) {
          await attachment("stderr", stderr.join("\n"), "text/plain");
        }
        await messageReader.attachErrors();
        await messageReader.attachResults();

        const outputFiles = await this.#reportOtherOutputFiles(testDir);

        await rm(testDir, { recursive: true });

        if ((code ?? -1) >= 0 && !signal) {
          resolve({
            ...messageReader.results,
            outputFiles,
            exitCode: code as number,
            stdout,
            stderr,
          });
        } else if (signal) {
          reject(new Error(`mocha was interrupted with ${signal}`));
        } else {
          reject(new Error(`mocha failed with exit code ${code || 1}`));
        }
      });
    });
  };

  protected getCopyEntry = (name: string, testDir: string): [string, string] => [
    path.join(this.samplesPath, name),
    path.join(testDir, name),
  ];

  protected getTransformEntry = (
    name: string,
    format: ModuleFormat,
    testDir: string,
    srcDir: string = this.samplesPath,
  ): [string, string, RegExp] => {
    return [
      path.join(srcDir, `${name}.js`),
      path.join(testDir, `${name}${getFormatExt(format)}`),
      uncommentPattern.get(format)!,
    ];
  };

  protected encodeEnvironmentInfo = () => this.toBase64Url(this.config.environmentInfo);

  protected encodeCategories = () => this.toBase64Url(this.config.categories);

  protected encodeExtraReporters = () => this.toBase64Url(this.config.extraReporters);

  protected encodeGlobalLabels = () => this.toBase64Url(this.config.globalLabels);

  protected toBase64Url = (value: any) => Buffer.from(JSON.stringify(value)).toString("base64url");

  #getSampleEntry = (name: string | readonly string[], samplesDir: string, testDir: string) => {
    if (name instanceof Array) {
      name = path.join(...name);
    }
    return this.getTransformEntry(`${name}.spec`, SPEC_FORMAT, testDir, samplesDir);
  };

  #resolveTestplanSelector = (prefix: string, [file, name]: TestPlanSelectorEntryFixture) => {
    return getPosixPath(`${path.join(prefix, ...file)}.spec${SPEC_EXT}: ${name}`);
  };

  #reportOtherOutputFiles = async (testDir: string) => {
    if (!this.config.outputFiles) {
      return new Map<string, Buffer>();
    }

    return await step("other output files", async () => {
      const outputFiles = new Map<string, Buffer>();
      for (const [file, contentType] of Object.entries(this.config.outputFiles ?? {})) {
        try {
          const content = await readFile(path.join(testDir, file));
          outputFiles.set(file, content);
          await attachment(file, content, { contentType, fileExtension: path.extname(file) });
        } catch {}
      }
      return outputFiles;
    });
  };

  getFilesToCopy: (testDir: string) => readonly [string, string][] = () => [];
  getFilesToTransform: (testDir: string) => readonly [string, string, RegExp][] = () => [];
  abstract getScriptPath: (testDir: string) => string;
  abstract getScriptArgs: () => string[];
}

class AllureMochaCliTestRunner extends AllureMochaTestRunner {
  getFilesToCopy = (testDir: string) => [this.getCopyEntry("reporter.cjs", testDir)];
  getScriptPath = () => this.#resolveMochaScript();
  getScriptArgs = () => {
    const args = ["--no-color", "--reporter", "./reporter.cjs", "**/*.spec.*"];

    if (this.config.environmentInfo) {
      args.push("--reporter-option", `environmentInfo=${this.encodeEnvironmentInfo()}`);
    }

    if (this.config.categories) {
      args.push("--reporter-option", `categories=${this.encodeCategories()}`);
    }

    if (this.config.extraReporters) {
      args.push("--reporter-option", `extraReporters=${this.encodeExtraReporters()}`);
    }

    if (this.config.globalLabels) {
      args.push("--reporter-option", `globalLabels=${this.encodeGlobalLabels()}`);
    }

    return args;
  };

  #resolveMochaScript = () => {
    const mochaPath = path.resolve(require.resolve("mocha"), "../bin/mocha");
    const versionMatch = /mocha-npm-(\d+)\.\d+.\d+/.exec(mochaPath);
    return versionMatch && parseInt(versionMatch[1], 10) < 10 ? mochaPath : `${mochaPath}.js`;
  };
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
  getScriptArgs = () => {
    const args = ["--"];

    if (this.config.environmentInfo) {
      args.push("--environment-info", this.encodeEnvironmentInfo());
    }

    if (this.config.categories) {
      args.push("--categories", this.encodeCategories());
    }

    if (this.config.extraReporters) {
      args.push("--extra-reporters", this.encodeExtraReporters());
    }

    if (this.config.globalLabels) {
      args.push("--global-labels", this.encodeGlobalLabels());
    }

    return args;
  };
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
