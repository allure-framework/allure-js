import Runner = Mocha.Runner;
import MochaOptions = Mocha.MochaOptions;
import { allureApiUrls } from "../consts/allure-api-urls";
import Mocha from "mocha";

const request = require("request");

export class CypressAllureReporter extends Mocha.reporters.Base {
  constructor(runner: Runner, opts: MochaOptions) {
    super(runner, opts);

    this.runner
      .on("suite", this.onSuite)
      .on("suite end", this.onSuiteEnd)
      .on("test", this.onTest)
      .on("pass", this.onPassed)
      .on("fail", this.onFailed)
      .on("pending", this.onPending);
  }

  onSuite(suite: Mocha.Suite) {
    request({
      url: `${allureApiUrls.apiUrl}${allureApiUrls.onSuite}`,
      method: "POST",
      json: { title: suite.fullTitle() }
    });
  }

  onSuiteEnd() {
    request({
      url: `${allureApiUrls.apiUrl}${allureApiUrls.onSuiteEnd}`,
      method: "POST"
    });
  }

  onTest(test: Mocha.Test) {
    request({
      url: `${allureApiUrls.apiUrl}${allureApiUrls.onTest}`,
      method: "POST",
      json: {
        test: serializeTest(test)
      }
    });
  }

  onPassed(test: Mocha.Test) {
    request({
      url: `${allureApiUrls.apiUrl}${allureApiUrls.onPassed}`,
      method: "POST",
      json: {
        test: serializeTest(test)
      }
    });
  }

  onFailed(test: Mocha.Test, error: any) {
    request({
      url: `${allureApiUrls.apiUrl}${allureApiUrls.onFailed}`,
      method: "POST",
      json: {
        test: serializeTest(test),
        error
      }
    });
  }

  onPending(test: Mocha.Test) {
    request({
      url: `${allureApiUrls.apiUrl}${allureApiUrls.onPending}`,
      method: "POST",
      json: {
        test: serializeTest(test)
      }
    });
  }
}

function serializeTest(test: Mocha.Test): any {
  return {
    ...test,
    fullTitle: test.fullTitle(),
    parent: test.parent ? {
      ...test.parent,
      fullTitle: test.parent.fullTitle(),
      titlePath: test.parent.titlePath()
    } : undefined
  };
}
