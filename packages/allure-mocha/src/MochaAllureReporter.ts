import { hostname } from "node:os";
import { env } from "node:process";
import * as Mocha from "mocha";
import { getSuitesOfMochaTest } from "./utils";
import {
  AllureNodeReporterRuntime,
  FileSystemAllureWriter,
  Config,
  setGlobalTestRuntime,
  TestResult,
  Status,
  Stage,
  LabelName,
  getRelativePath,
  getPackageLabelFromPath,
  ensureSuiteLabels,
  Label,
  getStatusFromError,
} from "allure-js-commons/new/sdk/node";
import {} from "allure-js-commons/new";
import { AllureMochaTestRuntime } from "./AllureMochaTestRuntime";


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

type ParallelRunner = Mocha.Runner & {
  linkPartialObjects?: (val: boolean) => ParallelRunner;
};

export class MochaAllureReporter extends Mocha.reporters.Base {
  private static readonly hostname = env.ALLURE_HOST_NAME || hostname();
  private readonly runtime: AllureNodeReporterRuntime;
  private readonly testRuntime: AllureMochaTestRuntime;
  private listenersChain = Promise.resolve();
  private listenerError: Error | null = null;

  constructor(
    readonly runner: ParallelRunner,
    readonly opts: Mocha.MochaOptions,
  ) {
    super(runner, opts);

    const { resultsDir = "allure-results", writer, ...restOptions }: Config = opts.reporterOptions || {};
    this.runtime = new AllureNodeReporterRuntime({
      writer: writer || new FileSystemAllureWriter({ resultsDir }),
      ...restOptions,
    });
    this.testRuntime = new AllureMochaTestRuntime(this.runtime);
    setGlobalTestRuntime(this.testRuntime); // Covers the serial mode

    if (runner.linkPartialObjects) {
      runner.linkPartialObjects(true);
    }

    this.applyAsyncListeners(runner);
  }

  done(failures: number, fn?: ((failures: number) => void) | undefined): void {
    this.listenersChain.finally(() => {
      fn?.(failures);
      this.listenersChain = Promise.resolve();
      this.listenerError = null;
      this.testRuntime.clearCurrentTest();
    });
  }

  private applyAsyncListeners(runner: Mocha.Runner) {
    /* eslint-disable @typescript-eslint/unbound-method */
    const listeners = [
      { event: EVENT_SUITE_BEGIN, listener: this.onSuite },
      { event: EVENT_SUITE_END, listener: this.onSuiteEnd },
      { event: EVENT_TEST_BEGIN, listener: this.onTest },
      { event: EVENT_TEST_PASS, listener: this.onPassed },
      { event: EVENT_TEST_FAIL, listener: this.onFailed },
      { event: EVENT_TEST_PENDING, listener: this.onPending },
      { event: EVENT_TEST_END, listener: this.onTestEnd },
      { event: EVENT_HOOK_BEGIN, listener: this.onHookStart },
      { event: EVENT_HOOK_END, listener: this.onHookEnd },
    ];

    /* eslint-enable @typescript-eslint/unbound-method */

    for (const {event, listener} of listeners) {
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const serializedAsyncListener = (...args: any[]) => {
        if (this.listenerError) {
          throw this.listenerError;
        }
        this.listenersChain = new Promise((resolve, reject) => {
          this.listenersChain.then(
            () => {
              try {
                // @ts-ignore
                listener.apply(this, args).then(resolve);
              } catch (error) {
                this.listenerError = error instanceof Error
                  ? error
                  : new Error(error?.toString() ?? "unknown error");
                this.listenerError.message = `INTERNAL ERROR in listener of ${event}: ${this.listenerError.message}`;
                reject(this.listenerError);
              }
            },
            reject,
          );
        });
      };
      // @ts-ignore
      runner.on(event, serializedAsyncListener);
    }
  }

  private async onSuite(suite: Mocha.Suite) {
    // this.coreReporter.startSuite(suite.fullTitle());
    // this.runtime.start
  }

  private async onSuiteEnd() {
    // this.coreReporter.endSuite();
  }

  private async onTest(test: Mocha.Test) {
    let fullName = "";
    const labels: Label[] = [
      { name: LabelName.LANGUAGE, value: "javascript" },
      { name: LabelName.FRAMEWORK, value: "mocha" },
      { name: LabelName.HOST, value: MochaAllureReporter.hostname },
    ];

    if (test.file) {
      const testPath = getRelativePath(test.file);
      fullName = `${testPath!}: `;
      labels.push(getPackageLabelFromPath(testPath));
    }

    fullName += test.titlePath().join(" > ");

    const uuid = this.runtime.start({
      name: test.title,
      stage: Stage.RUNNING,
      fullName,
      labels,
    });
    this.testRuntime.setCurrentTest(uuid as string);
  }

  private async onPassed(_: Mocha.Test) {
    await this.updateCurrentTest((r) => {
      r.status = Status.PASSED;
    });
  }

  private async onFailed(_: Mocha.Test, error: Error) {
    await this.updateCurrentTest((r) => {
      r.status = getStatusFromError(error);
      r.statusDetails = {
        message: error.message,
        trace: error.stack
      };
    });
  }

  private async onPending(test: Mocha.Test) {
    await this.onTest(test);
    await this.updateCurrentTest((r) => {
      r.status = Status.SKIPPED;
      r.statusDetails = {
        message: "Test skipped",
      };
    });
  }

  private async onTestEnd(test: Mocha.Test) {
    const testUuid = this.testRuntime.getCurrentTest();
    if (testUuid) {
      const defaultSuites = getSuitesOfMochaTest(test);
      this.runtime.update(testUuid, (t) => {
        ensureSuiteLabels(t, defaultSuites);
        t.stage = Stage.FINISHED;
      });
      this.runtime.stop(testUuid);
      this.runtime.write(testUuid);
      this.testRuntime.clearCurrentTest();
    }
  }

  private async onHookStart(hook: Mocha.Hook) {
    // this.coreReporter.startHook(hook);
  }

  private async onHookEnd(hook: Mocha.Hook) {
    // const error: Error | undefined = hook?.error?.();
    // this.coreReporter.endHook(error);
  }

  private async updateCurrentTest(update: (test: Partial<TestResult>) => void | Promise<void>) {
    const currentTestUuid = this.testRuntime.getCurrentTest();
    if (currentTestUuid) {
      this.runtime.update(currentTestUuid, update);
    } else {
      throw new Error("Internal error: no current test exists");
    }
  }
}
