import path from "path";
import { AllureRuntime, Status } from "allure-js-commons";

interface KarmaResult {
  fullName: string;
  skipped: boolean;
  success: boolean;
  time: number;
  log?: string[];
}

class AllureReporter {
  static $inject: string[];

  allureRuntime: AllureRuntime;
  constructor() {
    this.allureRuntime = new AllureRuntime({
      resultsDir: defaultReportFolder(),
    });
  }

  onSpecComplete(_browsers: any, result: KarmaResult) {
    const group = this.allureRuntime.startGroup(result.fullName);
    const test = group.startTest(result.fullName, 0);

    if (result.skipped) {
      test.status = Status.SKIPPED;
    } else if (result.success) {
      test.status = Status.PASSED;
    } else {
      test.status = Status.FAILED;
    }

    if (result.log) {
      test.statusDetails = { message: result.log.toString() };
    }
    group.endGroup();
  }
}

const defaultReportFolder = (): string => {
  return path.resolve(process.cwd(), "allure-results");
};

export = {
  "reporter:allure": ["type", AllureReporter],
};
