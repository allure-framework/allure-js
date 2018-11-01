import * as Mocha from 'mocha';
import { AllureReporter } from './AllureReporter';

const allure = new AllureReporter();
// @ts-ignore
global.allure = allure.getInterface();

export class MochaAllureReporter extends Mocha.reporters.Base {
  constructor(readonly runner: Mocha.Runner, readonly opts: Mocha.MochaOptions) {
    super(runner, opts);

    const reporterOpts = opts.reporterOptions;
    const resultsDir = (reporterOpts && reporterOpts.resultsDir) || 'allure-results';
    allure.setupRuntime(resultsDir);

    this.runner
      .on('suite', this.onSuite.bind(this))
      .on('suite end', this.onSuiteEnd.bind(this))
      .on('test', this.onTest.bind(this))
      .on('pass', this.onPassed.bind(this))
      .on('fail', this.onFailed.bind(this))
      .on('pending', this.onPending.bind(this));
  }

  private onSuite(suite: Mocha.Suite) {
    allure.startSuite(suite.fullTitle());
  }

  private onSuiteEnd() {
    allure.endSuite();
  }

  private onTest(test: Mocha.Test) {
    const suite = test.parent;
    allure.startCase((suite && suite.title) || 'Unnamed', test.title);
  }

  private onPassed(test: Mocha.Test) {
    allure.passTestCase();
  }

  private onFailed(test: Mocha.Test, error: Error) {
    allure.failTestCase(test, error);
  }

  private onPending(test: Mocha.Test) {
    allure.pendingTestCase(test);
  }
}
