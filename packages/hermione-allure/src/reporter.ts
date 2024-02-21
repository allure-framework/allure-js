import Hermione, { Test } from "hermione";
import { WorkerProcess } from "hermione/build/src/utils/worker-process";
import * as os from "node:os";
import * as process from "node:process";
import {
  AllureRuntime,
  AllureStep,
  AllureTest,
  ContentType,
  LabelName,
  Link,
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

export class AllureHermioneReporter {
  hermione: Hermione;
  runtime: AllureRuntime;
  options: AllureReportOptions;
  runningTests: Map<string, AllureTest> = new Map();
  runningSteps: Map<string, AllureStep[]> = new Map();

  constructor(hermione: Hermione, opts?: AllureReportOptions) {
    this.options = opts || {};
    this.hermione = hermione;
    this.runtime = new AllureRuntime({
      resultsDir: allureReportFolder(opts?.resultsDir),
      writer: opts?.writer,
    });
    this.subscribeToEvents();
  }

  private subscribeToEvents() {
    this.hermione.on(this.hermione.events.NEW_WORKER_PROCESS, this.onWorkerProcess.bind(this));
    this.hermione.on(this.hermione.events.TEST_BEGIN, this.onTestBegin.bind(this));
    this.hermione.on(this.hermione.events.TEST_PASS, this.onTestPass.bind(this));
    this.hermione.on(this.hermione.events.TEST_FAIL, this.onTestFail.bind(this));
    this.hermione.on(this.hermione.events.TEST_PENDING, this.onTestPending.bind(this));
    this.hermione.on(this.hermione.events.TEST_END, this.onTestEnd.bind(this));
  }

  private processMetadataLinks(links: Link[]): Link[] {
    return links.map((link) => {
      // TODO:
      // @ts-ignore
      const matcher = this.options.links?.find?.(({ type }) => type === link.type);

      // TODO:
      if (!matcher || link.url.startsWith("http")) {
        return link;
      }

      const url = matcher.urlTemplate.replace("%s", link.url);

      return {
        ...link,
        url,
      };
    });
  }

  private applyMetadata(message: HermioneMetadataMessage) {
    const currentTest = this.runningTests.get(message.testId);

    if (!currentTest) {
      // eslint-disable-next-line no-console
      console.error("Can't assign attachment due test has been finished or hasn't been started");
      return;
    }

    const currentSteps = this.runningSteps.get(message.testId) || [];
    const currentStep = currentSteps[currentSteps.length - 1];
    const currentExecutable = (currentStep || currentTest) as AllureTest | AllureStep;
    const { links = [], attachments = [], parameter = [], ...metadata } = message.metadata;

    attachments.forEach((attachment) => {
      const attachmentFilename = this.runtime.writeAttachment(attachment.content, attachment.type, attachment.encoding);

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

    currentTest.applyMetadata({
      ...metadata,
      links: this.processMetadataLinks(links),
    });
  }

  private startAllureTest(test: Test) {
    const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env;
    // @ts-ignore
    const thread = (ALLURE_THREAD_NAME || test.sessionId) as string;
    const hostnameLabel = ALLURE_HOST_NAME || hostname;
    const fileSrcPath = getFileSrcPath(test.file as string);
    const testFullTitle = test.fullTitle();
    const currentTest = new AllureTest(this.runtime, Date.now());
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

    this.runningTests.set(test.id as string, currentTest);
  }

  private startAllureStep(message: HermioneStartStepMessage) {
    const currentTest = this.runningTests.get(message.testId);
    const currentSteps = this.runningSteps.get(message.testId) || [];
    const currentExecutable = currentSteps[currentSteps.length - 1] || currentTest;

    if (!currentExecutable) {
      // eslint-disable-next-line no-console
      console.error("Can't start step because there isn't any running test or step!");
      return;
    }

    const currentStep = currentExecutable.startStep(message.name);

    this.runningSteps.set(message.testId, currentSteps.concat(currentStep));
  }

  private endAllureStep(message: HermioneEndStepMessage) {
    const currentTest = this.runningTests.get(message.testId);
    const currentSteps = this.runningSteps.get(message.testId) || [];
    const currentStep = currentSteps.pop();

    if (!currentStep) {
      // eslint-disable-next-line no-console
      console.error("There isn't any running step to end!");
    }

    if (message.status !== Status.PASSED) {
      currentTest!.status = message.status;
    }

    currentStep!.status = message.status;
    currentStep!.statusDetails = message.statusDetails!;
    currentStep!.stage = message.stage || Stage.FINISHED;

    currentStep!.endStep(Date.now());
  }

  private handleAllureRuntimeMessage(message: HermioneRuntimeMessage) {
    switch (message.type) {
      case HermioneRuntimeMessageType.METADATA:
        this.applyMetadata(message);
        break;
      case HermioneRuntimeMessageType.START_STEP:
        this.startAllureStep(message);
        break;
      case HermioneRuntimeMessageType.END_STEP:
        this.endAllureStep(message);
        break;
    }
  }

  onWorkerProcess(worker: WorkerProcess) {
    // eslint-disable-next-line
    // @ts-ignore
    worker.process.on("message", (message: { contentType?: string; payload: HermioneRuntimeMessage }) => {
      if (message.contentType === ALLURE_METADATA_CONTENT_TYPE) {
        this.handleAllureRuntimeMessage(message.payload);
      }
    });
  }

  onTestBegin(test: Test) {
    // don't report skipped tests
    if (!test.fn) {
      return;
    }

    // test hasn't been actually started
    if (!test.browserId) {
      return;
    }

    this.startAllureTest(test);
  }

  onTestPass(test: Test) {
    const currentTest = this.runningTests.get(test.id as string)!;

    currentTest.status = Status.PASSED;
  }

  onTestFail(test: Test) {
    const currentTest = this.runningTests.get(test.id as string)!;

    // test can be failed due to step execution
    if (!currentTest.status) {
      currentTest.status = Status.FAILED;
    }

    // FIXME: temp solution, fix after https://github.com/gemini-testing/hermione/pull/848 will be released
    // @ts-ignore
    const { message = "", stack = "", screenshot } = test?.err || {};

    currentTest.statusDetails = {
      message,
      trace: stack,
    };

    // @ts-ignore
    if (!screenshot) {
      return;
    }

    const attachmentFilename = this.runtime.writeAttachment(screenshot.base64 as string, ContentType.PNG, "base64");

    currentTest.addAttachment(
      "Screenshot",
      {
        contentType: ContentType.PNG,
      },
      attachmentFilename,
    );
  }

  onTestPending(test: Test) {
    // don't report skipped tests
    if (!test.fn) {
      return;
    }

    const currentTest = this.runningTests.get(test.id as string)!;

    currentTest.status = Status.SKIPPED;
    currentTest.stage = Stage.PENDING;
  }

  onTestEnd(test: Test) {
    // don't report skipped tests
    if (!test.fn) {
      return;
    }

    const currentTest = this.runningTests.get(test.id as string)!;

    // don't reassign historyId if it already has been set manually
    if (!currentTest.historyId) {
      currentTest.calculateHistoryId();
    }

    // finish only running tests, skipped ones have pending stage which shouldn't be reassigned
    if (currentTest.stage === Stage.RUNNING) {
      currentTest.stage = Stage.FINISHED;
    }

    currentTest.endTest(Date.now());

    this.runningTests.delete(test.id as string);
  }
}
