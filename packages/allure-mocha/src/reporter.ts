import * as Mocha from "mocha";
import "allure-js-commons";
import {
  AllureNodeReporterRuntime,
  Config,
  FileSystemAllureWriter,
  Stage,
  Status,
  ensureSuiteLabels,
  getPackageLabelFromPath,
  getRelativePath,
  getStatusFromError,
} from "allure-js-commons/sdk/node";
import { setUpTestRuntime } from "./MochaTestRuntime.js";
import { getInitialLabels, getSuitesOfMochaTest, resolveParallelModeSetupFile } from "./utils.js";

const {
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_END,
  EVENT_TEST_PASS,
  EVENT_TEST_FAIL,
  EVENT_TEST_PENDING,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END,
} = Mocha.Runner.constants;

export class MochaAllureReporter extends Mocha.reporters.Base {
  private readonly runtime: AllureNodeReporterRuntime;

  constructor(runner: Mocha.Runner, opts: Mocha.MochaOptions) {
    super(runner, opts);

    const { resultsDir = "allure-results", writer, ...restOptions }: Config = opts.reporterOptions || {};
    this.runtime = new AllureNodeReporterRuntime({
      writer: writer || new FileSystemAllureWriter({ resultsDir }),
      ...restOptions,
    });

    setUpTestRuntime(this.runtime);

    if (opts.parallel) {
      opts.require = [...(opts.require ?? []), resolveParallelModeSetupFile()];
    } else {
      this.applyListeners();
    }
  }

  private applyListeners = () => {
    this.runner
      .on(EVENT_SUITE_BEGIN, this.onSuite)
      .on(EVENT_SUITE_END, this.onSuiteEnd)
      .on(EVENT_TEST_BEGIN, this.onTest)
      .on(EVENT_TEST_PASS, this.onPassed)
      .on(EVENT_TEST_FAIL, this.onFailed)
      .on(EVENT_TEST_PENDING, this.onPending)
      .on(EVENT_TEST_END, this.onTestEnd)
      .on(EVENT_HOOK_BEGIN, this.onHookStart)
      .on(EVENT_HOOK_END, this.onHookEnd);
  };

  private onSuite = () => {
    this.runtime.startScope();
  };

  private onSuiteEnd = () => {
    this.runtime.writeScope();
  };

  private onTest = (test: Mocha.Test) => {
    let fullName = "";
    const labels = getInitialLabels();

    if (test.file) {
      const testPath = getRelativePath(test.file);
      fullName = `${testPath!}: `;
      labels.push(getPackageLabelFromPath(testPath));
    }

    fullName += test.titlePath().join(" > ");

    this.runtime.startTest(
      {
        name: test.title,
        stage: Stage.RUNNING,
        fullName,
        labels,
      },
      { dedicatedScope: true },
    );
  };

  private onPassed = () => {
    this.runtime.updateTest((r) => {
      r.status = Status.PASSED;
    });
  };

  private onFailed = (_: Mocha.Test, error: Error) => {
    this.runtime.updateTest((r) => {
      r.status = getStatusFromError(error);
      r.statusDetails = {
        message: error.message,
        trace: error.stack,
      };
    });
  };

  private onPending = (test: Mocha.Test) => {
    this.onTest(test);
    this.runtime.updateTest((r) => {
      r.status = Status.SKIPPED;
      r.statusDetails = {
        message: "Test skipped",
      };
    });
  };

  private onTestEnd = (test: Mocha.Test) => {
    const defaultSuites = getSuitesOfMochaTest(test);
    this.runtime.updateTest((t) => {
      ensureSuiteLabels(t, defaultSuites);
      t.stage = Stage.FINISHED;
    });
    this.runtime.stopTest();
    this.runtime.writeTest();
  };

  private onHookStart = (hook: Mocha.Hook) => {
    const name = hook.originalTitle ?? "";
    // eslint-disable-next-line @typescript-eslint/quotes
    if (name.startsWith('"before')) {
      this.runtime.startFixture("before", { name });
      // eslint-disable-next-line @typescript-eslint/quotes
    } else if (name.startsWith('"after')) {
      this.runtime.startFixture("after", { name });
    }
  };

  private onHookEnd = (hook: Mocha.Hook) => {
    if (this.runtime.hasFixture()) {
      this.runtime.updateFixture((r) => {
        const error = hook.error();
        if (error) {
          r.status = getStatusFromError(error);
          r.statusDetails = {
            message: error.message,
            trace: error.stack,
          };
        } else {
          r.status = Status.PASSED;
        }
      });
      this.runtime.stopFixture();
    }
  };
}
