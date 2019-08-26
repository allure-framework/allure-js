import * as Mocha from "mocha";
import { AllureRuntime, IAllureConfig } from "allure-js-commons";
import { AllureReporter } from "./AllureReporter";
import { MochaAllureInterface } from "./MochaAllureInterface";

export let allure: MochaAllureInterface;

export class MochaAllureReporter extends Mocha.reporters.Base {
  private coreReporter: AllureReporter;

  constructor(readonly runner: Mocha.Runner, readonly opts: Mocha.MochaOptions) {
    super(runner, opts);

    const allureConfig: IAllureConfig = { resultsDir: "allure-results", ...opts.reporterOptions };

    this.coreReporter = new AllureReporter(new AllureRuntime(allureConfig));

    allure = this.coreReporter.getInterface();

    this.runner
      .on("suite", this.onSuite.bind(this))
      .on("suite end", this.onSuiteEnd.bind(this))
      .on("test", this.onTest.bind(this))
      .on("pass", this.onPassed.bind(this))
      .on("fail", this.onFailed.bind(this))
      .on("pending", this.onPending.bind(this));
  }

  private onSuite(suite: Mocha.Suite) {
    this.coreReporter.startSuite(suite.fullTitle());
  }

  private onSuiteEnd() {
    this.coreReporter.endSuite();
  }

  private onTest(test: Mocha.Test) {
    this.coreReporter.startCase(test);
  }

  private onPassed(test: Mocha.Test) {
    this.coreReporter.passTestCase(test);
  }

  private onFailed(test: Mocha.Test, error: Error) {
    this.coreReporter.failTestCase(test, error);
  }

  private onPending(test: Mocha.Test) {
    this.coreReporter.pendingTestCase(test);
  }
}
