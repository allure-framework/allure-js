import { AllureConfig, AllureRuntime } from "allure-js-commons";
import * as Mocha from "mocha";
import { AllureReporter } from "./AllureReporter";
import { MochaAllure } from "./MochaAllure";
import { MochaAllureGateway } from "./MochaAllureGateway";

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

let mochaAllure: MochaAllure;

// eslint-disable-next-line
// @ts-ignore
export const allure: MochaAllure = new MochaAllureGateway(() => mochaAllure);

type ParallelRunner = Mocha.Runner & {
  linkPartialObjects?: (val: boolean) => ParallelRunner;
};

export class MochaAllureReporter extends Mocha.reporters.Base {
  private coreReporter: AllureReporter;

  constructor(readonly runner: ParallelRunner, readonly opts: Mocha.MochaOptions) {
    super(runner, opts);

    const { resultsDir = "allure-results" } = opts.reporterOptions || {};
    const allureConfig: AllureConfig = {
      ...opts.reporterOptions,
      resultsDir,
    };
    const runtime = new AllureRuntime(allureConfig);

    this.coreReporter = new AllureReporter(runtime);

    mochaAllure = this.coreReporter.getImplementation();

    if (runner.linkPartialObjects) {
      runner.linkPartialObjects(true);
    }

    runner
      .on(EVENT_SUITE_BEGIN, this.onSuite.bind(this))
      .on(EVENT_SUITE_END, this.onSuiteEnd.bind(this))
      .on(EVENT_TEST_BEGIN, this.onTest.bind(this))
      .on(EVENT_TEST_PASS, this.onPassed.bind(this))
      .on(EVENT_TEST_FAIL, this.onFailed.bind(this))
      .on(EVENT_TEST_PENDING, this.onPending.bind(this))
      .on(EVENT_HOOK_BEGIN, this.onHookStart.bind(this))
      .on(EVENT_HOOK_END, this.onHookEnd.bind(this));
  }

  private onSuite(suite: Mocha.Suite): void {
    this.coreReporter.startSuite(suite.fullTitle());
  }

  private onSuiteEnd(): void {
    this.coreReporter.endSuite();
  }

  private onTest(test: Mocha.Test): void {
    this.coreReporter.startCase(test);
  }

  private onPassed(test: Mocha.Test): void {
    this.coreReporter.passTestCase(test);
  }

  private onFailed(test: Mocha.Test, error: Error): void {
    this.coreReporter.failTestCase(test, error);
  }

  private onPending(test: Mocha.Test): void {
    this.coreReporter.pendingTestCase(test);
  }

  private onHookStart(hook: Mocha.Hook): void {
    this.coreReporter.startHook(hook);
  }

  private onHookEnd(hook: Mocha.Hook): void {
    this.coreReporter.endHook(hook?.error?.());
  }
}
