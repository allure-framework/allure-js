import * as Mocha from "mocha";
import { AllureRuntime, IAllureConfig } from "allure-js-commons";
import { AllureReporter } from "./AllureReporter";

export class MochaAllureReporter extends Mocha.reporters.Base {
  private allure: AllureReporter;

  constructor(readonly runner: Mocha.Runner, readonly opts: Mocha.MochaOptions) {
    super(runner, opts);

    const allureConfig: IAllureConfig = { resultsDir: "allure-results", ...opts.reporterOptions };

    this.allure = new AllureReporter(new AllureRuntime(allureConfig));

    (global as any).allure = this.allure.getInterface();

    this.runner
      .on("suite", this.onSuite.bind(this))
      .on("suite end", this.onSuiteEnd.bind(this))
      .on("test", this.onTest.bind(this))
      .on("pass", this.onPassed.bind(this))
      .on("fail", this.onFailed.bind(this))
      .on("pending", this.onPending.bind(this));
  }

  private onSuite(suite: Mocha.Suite) {
    this.allure.startSuite(suite.fullTitle());
  }

  private onSuiteEnd() {
    this.allure.endSuite();
  }

  private onTest(test: Mocha.Test) {
    this.allure.startCase(test);
  }

  private onPassed(test: Mocha.Test) {
    this.allure.passTestCase();
  }

  private onFailed(test: Mocha.Test, error: Error) {
    this.allure.failTestCase(test, error);
  }

  private onPending(test: Mocha.Test) {
    this.allure.pendingTestCase(test);
  }
}
