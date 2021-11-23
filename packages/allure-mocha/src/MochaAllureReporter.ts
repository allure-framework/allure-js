import { AllureConfig, AllureRuntime } from "allure-js-commons";
import * as Mocha from "mocha";
import { AllureReporter } from "./AllureReporter";
import { MochaAllure } from "./MochaAllure";

export let allure: MochaAllure;

export class MochaAllureReporter extends Mocha.reporters.Base {
  private coreReporter: AllureReporter;

  constructor(readonly runner: Mocha.Runner, readonly opts: Mocha.MochaOptions) {
    super(runner, opts);

    const { resultsDir } = opts.reporterOptions;
    const allureConfig: AllureConfig = {
      resultsDir: resultsDir || "allure-results",
      ...opts.reporterOptions,
    };

    this.coreReporter = new AllureReporter(new AllureRuntime(allureConfig));
    allure = this.coreReporter.getImplementation();

    this.runner
      .on("suite", this.onSuite.bind(this))
      .on("suite end", this.onSuiteEnd.bind(this))
      .on("test", this.onTest.bind(this))
      .on("pass", this.onPassed.bind(this))
      .on("fail", this.onFailed.bind(this))
      .on("pending", this.onPending.bind(this))
      .on("hook", this.onHookStart.bind(this))
      .on("hook end", this.onHookEnd.bind(this));
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
    this.coreReporter.endHook(hook.error());
  }
}
