import * as os from "node:os";
import * as process from "node:process"
import { AllureRuntime, Allure, AllureTest, LabelName, Stage, Status, StatusDetails } from "allure-js-commons"
import Hermione from "hermione";

export type AllureReportOptions = {
  resultsDir?: string;
};

export function getSuitePath(test: Hermione.Test): string[] {
  const path = [];
  let currentSuite: Hermione.MochaSuite | undefined = test.parent;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent;
  }

  return path;
}

const hermioneAllureReporter = (hermione: Hermione, opts: AllureReportOptions) => {
  const runtime = new AllureRuntime({
    resultsDir: "allure-results",
    ...opts
  })
  const runningTests: Map<string, AllureTest> = new Map()

  hermione.on(hermione.events.TEST_BEGIN, (testResult) => {
    const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env
    const thread = ALLURE_THREAD_NAME || testResult.sessionId;
    const hostname = ALLURE_HOST_NAME || os.hostname()
    const currentTest = new AllureTest(runtime, Date.now())

    currentTest.name = testResult.title
    currentTest.fullName = testResult.fullTitle()
    // TODO:
    // currentTest.historyId = md5(currentTest.fullName);
    currentTest.stage = Stage.RUNNING

    currentTest.addLabel(LabelName.HOST, hostname);
    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.FRAMEWORK, "hermione");
    currentTest.addLabel(LabelName.THREAD, thread);

    if (testResult.parent) {
      const [parentSuite, suite, ...subSuites] = getSuitePath(testResult);

      if (parentSuite) {
        currentTest.addLabel(LabelName.PARENT_SUITE, parentSuite);
      }

      if (suite) {
        currentTest.addLabel(LabelName.SUITE, suite);
      }

      if (subSuites.length > 0) {
        currentTest.addLabel(LabelName.SUB_SUITE, subSuites.join(" > "));
      }
    }

    runningTests.set(testResult.sessionId, currentTest)
  })
  hermione.on(hermione.events.TEST_PASS, (testResult) => {
    const currentTest = runningTests.get(testResult.sessionId)

    if (!currentTest) {
      throw new Error("SUCCESS bla bla no test here")
    }

    currentTest.status = Status.PASSED
  });

  // TODO:
  // hermione.on(hermione.events.RETRY, (testResult) => {
  //   console.log("test retry", testResult);
  //   // promises.push(queue.add(() => failHandler(testResult).then(addFail)).catch(reject));
  // });

  hermione.on(hermione.events.TEST_FAIL, (testResult) => {
    const currentTest = runningTests.get(testResult.sessionId)

    if (!currentTest) {
      throw new Error("FAIL bla bla no test here")
    }

    currentTest.status = Status.FAILED
  });

  hermione.on(hermione.events.TEST_END, (testResult) => {
    const currentTest = runningTests.get(testResult.sessionId)

    if (!currentTest) {
      throw new Error("FAIL bla bla no test here")
    }

    // TODO: maybe better to move this logic to a function
    if (testResult?.err) {
      currentTest.detailsMessage = testResult.err.message
      currentTest.detailsTrace = testResult.err.stack

      // FIXME:
      // @ts-ignore
      const screenshot = testResult.err?.screenshot

      // FIXME:
      if (screenshot) {
        const attachmentFilename = runtime.writeAttachment(screenshot.base64, "image/png", "base64");

        currentTest.addAttachment(
          "Screenshot",
          {
            contentType: "image/png"
          },
          attachmentFilename
        )
      }
    }

    currentTest.stage = Stage.FINISHED
    currentTest.endTest(Date.now())

    runningTests.delete(testResult.sessionId)
  })

  // hermione.on(hermione.events.TEST_PENDING, (testResult) => {
  //   console.log("test pending", testResult);
  //   // promises.push(queue.add(() => failHandler(testResult).then((testResult) => reportBuilder.addSkipped(testResult)).catch(reject)));
  // });

  // hermione.on(hermione.events.RUNNER_END, () => {
  //   // console.log("runner end", runtime)
  //   // console.log("test runner end");
  //   // return Promise.all(promises).then(resolve, reject);
  // });

  // return new Promise((resolve, reject) => {
  //   // const queue = new PQueue({concurrency: os.cpus().length});
  //   // const promises = [];

  // });
};

module.exports = hermioneAllureReporter;
