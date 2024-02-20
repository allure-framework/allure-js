/* eslint no-underscore-dangle: 0 */

/* eslint import/order: 0 */
import Hermione, { Test } from "hermione";
import * as os from "node:os";
import * as process from "node:process";
import {
  AllureRuntime,
  AllureStep,
  AllureTest,
  LabelName,
  Stage,
  Status,
  allureReportFolder,
  getSuitesLabels,
  md5,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";
import {
  AllureReportOptions,
  HermioneEndStepMessage,
  HermioneMetadataMessage,
  HermioneRuntimeMessage,
  HermioneRuntimeMessageType,
  HermioneStartStepMessage,
} from "./model";
import { getFileSrcPath, getSuitePath } from "./utils";

const hostname = os.hostname();

const hermioneAllureReporter = (hermione: Hermione, opts?: AllureReportOptions) => {
  if (opts?.enabled === false) {
    return;
  }

  const runningTests: Map<string, AllureTest> = new Map();
  const runningSteps: Map<string, AllureStep[]> = new Map();

  const resultsDir = allureReportFolder(opts?.resultsDir);
  const runtime = new AllureRuntime({
    resultsDir,
    writer: opts?.writer,
  });
  /**
   * Create Allure test from Hermione test object with all the possible initial labels
   *
   * @param test Hermione test object
   * @returns Allure test
   */
  const createAllureTest = (test: Test): AllureTest => {
    const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env;
    // @ts-ignore
    const thread = (ALLURE_THREAD_NAME || test.sessionId) as string;
    const hostnameLabel = ALLURE_HOST_NAME || hostname;
    const fileSrcPath = getFileSrcPath(test.file as string);
    const testFullTitle = test.fullTitle();
    const currentTest = new AllureTest(runtime, Date.now());
    const suites = getSuitePath(test);

    currentTest.name = test.title;
    currentTest.fullName = testFullTitle;
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.HOST, hostnameLabel);
    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.FRAMEWORK, "hermione");
    currentTest.addParameter("browser", test.browserId as string);

    if (!currentTest.testCaseId) {
      currentTest.testCaseId = md5(`${fileSrcPath}#${testFullTitle}`);
    }

    if (thread) {
      currentTest.addLabel(LabelName.THREAD, thread);
    }

    getSuitesLabels(suites).forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });

    return currentTest;
  };
  const applyMetadata = (message: HermioneMetadataMessage) => {
    const currentTest = runningTests.get(message.testId);

    if (!currentTest) {
      // eslint-disable-next-line no-console
      console.error("Can't assign attachment due test has been finished or hasn't been started");
      return;
    }

    const currentSteps = runningSteps.get(message.testId) || [];
    const currentStep = currentSteps[currentSteps.length - 1];
    const currentExecutable = (currentStep || currentTest) as AllureTest | AllureStep;
    const { attachments = [], parameter = [], ...metadata } = message.metadata;

    attachments.forEach((attachment) => {
      const attachmentFilename = runtime.writeAttachment(attachment.content, attachment.type, attachment.encoding);

      currentExecutable.addAttachment(
        attachment.name,
        {
          contentType: attachment.type,
        },
        attachmentFilename,
      );
    });
    parameter.forEach((param) => {
      currentExecutable.parameter(param.name, param.value, {
        excluded: param.excluded,
        mode: param.mode,
      });
    });

    currentTest.applyMetadata(metadata);
  };
  const startAllureStep = (message: HermioneStartStepMessage) => {
    // console.log("start step", message);
    const currentTest = runningTests.get(message.testId);
    const currentSteps = runningSteps.get(message.testId) || [];
    const currentExecutable = currentSteps[currentSteps.length - 1] || currentTest;

    if (!currentExecutable) {
      // FIXME: change error message
      // eslint-disable-next-line no-console
      console.error("Can't assign attachment due test has been finished or hasn't been started");
    }

    const currentStep = currentExecutable.startStep(message.name);

    runningSteps.set(message.testId, currentSteps.concat(currentStep));
  };
  const endAllureStep = (message: HermioneEndStepMessage) => {
    const currentTest = runningTests.get(message.testId);
    const currentSteps = runningSteps.get(message.testId) || [];
    const currentStep = currentSteps.pop();

    if (!currentStep) {
      // FIXME: change error message
      // eslint-disable-next-line no-console
      console.error("Can't assign attachment due test has been finished or hasn't been started");
    }

    if (message.status !== Status.PASSED) {
      currentTest!.status = message.status;
    }

    currentStep!.status = message.status;
    currentStep!.statusDetails = message.statusDetails!;
    currentStep!.stage = message.stage || Stage.FINISHED;

    currentStep!.endStep(Date.now());
  };
  const handleAllureRuntimeMessage = (message: HermioneRuntimeMessage) => {
    switch (message.type) {
      case HermioneRuntimeMessageType.METADATA:
        applyMetadata(message);
        break;
      case HermioneRuntimeMessageType.START_STEP:
        startAllureStep(message);
        break;
      case HermioneRuntimeMessageType.END_STEP:
        endAllureStep(message);
        break;
    }
  };

  hermione.on(hermione.events.NEW_WORKER_PROCESS, (worker) => {
    // eslint-disable-next-line
    // @ts-ignore
    worker.process.on("message", (message: { contentType?: string; payload: HermioneRuntimeMessage }) => {
      if (message.contentType === ALLURE_METADATA_CONTENT_TYPE) {
        handleAllureRuntimeMessage(message.payload);
      }
    });
  });
  hermione.on(hermione.events.TEST_BEGIN, (test) => {
    // don't report skipped tests
    if (!test.fn) {
      return;
    }

    // test hasn't been actually started
    if (!test.browserId) {
      return;
    }

    const currentTest = createAllureTest(test);

    runningTests.set(test.id as string, currentTest);
  });
  hermione.on(hermione.events.TEST_PASS, (test) => {
    const currentTest = runningTests.get(test.id as string)!;

    currentTest.status = Status.PASSED;
  });
  hermione.on(hermione.events.TEST_FAIL, (test) => {
    const currentTest = runningTests.get(test.id as string)!;

    // test can be failed due to step execution
    if (!currentTest.status) {
      currentTest.status = Status.FAILED;
    }

    currentTest.statusDetails = {
      message: test?.err?.message || "",
      trace: test?.err?.stack || "",
    };

    if (!test?.err?.screenshot) {
      return;
    }

    // TODO: attach screenshot
  });
  hermione.on(hermione.events.TEST_PENDING, (test) => {
    // don't report skipped tests
    if (!test.fn) {
      return;
    }

    const currentTest = runningTests.get(test.id as string)!;

    currentTest.status = Status.SKIPPED;
    currentTest.stage = Stage.PENDING;
  });
  hermione.on(hermione.events.TEST_END, (test) => {
    // don't report skipped tests
    if (!test.fn) {
      return;
    }

    // console.log({ test });

    const currentTest = runningTests.get(test.id as string)!;

    // don't reassign historyId if it already has been set manually
    if (!currentTest.historyId) {
      currentTest.calculateHistoryId();
    }

    // TODO: we don't need to report every skipped test
    // the test has been skipped
    // if (test.pending) {
    //   currentTest.status = Status.SKIPPED;
    // }

    // TODO:
    // test.duration

    if (currentTest.stage === Stage.RUNNING) {
      currentTest.stage = Stage.FINISHED;
    }

    currentTest.endTest(Date.now());
    runningTests.delete(test.id as string);
  });
};

module.exports = hermioneAllureReporter;
