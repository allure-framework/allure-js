/* eslint no-underscore-dangle: 0 */

/* eslint import/order: 0 */
import Hermione from "hermione";
import * as os from "node:os";
import * as process from "node:process";
import {
  AllureCommandStepExecutable,
  AllureRuntime,
  AllureTest,
  ContentType,
  LabelName,
  LinkType,
  MetadataMessage,
  ParameterOptions,
  Stage,
  Status,
  StepBodyFunction,
  allureReportFolder,
  getSuitesLabels,
  md5,
} from "allure-js-commons";
import { AllureWriter } from "allure-js-commons/dist/src/writers";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";
import {
  addAttachment,
  addLabel,
  addLink,
  addParameter,
  getFileSrcPath,
  getSuitePath,
  sendMetadata,
  setDescription,
  setDescriptionHtml,
  setDisplayName,
  setHistoryId,
  setTestCaseId,
} from "./utils";

export type HermioneAttachmentMessage = {
  testId: string;
  metadata: MetadataMessage;
};

export type AllureReportOptions = {
  resultsDir?: string;
  writer?: AllureWriter;
};

export type TestIDFactory = (testId?: string) => string;

const hostname = os.hostname();
/**
 * Creates browser-specific test ID to identify test in the reporter
 *
 * @param context Hermione test object, or browser ID string
 * @returns Browser-specific test ID factory function
 */
const getTestId = (
  context: string | Hermione.Test | (Omit<Hermione.Test, "id"> & { id: () => string }),
): TestIDFactory => {
  if (typeof context === "string") {
    return (testId?: string) => `${context}:${testId || ""}`;
  }

  // hermone >= 7.0.0 has `id` property as a string
  if (typeof context.id === "string") {
    // eslint-disable-next-line
    return () => `${context.browserId}:${context.id}`;
  }

  const contextId = context.id();

  return () => `${context.browserId}:${contextId}`;
};
const addCommands = (browser: WebdriverIO.Browser, testIdFactory: (testId?: string) => string) => {
  browser.addCommand("label", async (id: string, name: string, value: string) => {
    await addLabel(testIdFactory(id), name, value);
  });
  browser.addCommand("link", async (id: string, url: string, name?: string, type?: string) => {
    await addLink(testIdFactory(id), url, name, type);
  });
  browser.addCommand("parameter", async (id: string, name: string, value: any, options?: ParameterOptions) => {
    await addParameter(testIdFactory(id), name, value, options);
  });
  browser.addCommand("id", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.ALLURE_ID, value);
  });
  browser.addCommand("epic", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.EPIC, value);
  });
  browser.addCommand("feature", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.FEATURE, value);
  });
  browser.addCommand("story", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.STORY, value);
  });
  browser.addCommand("suite", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.SUITE, value);
  });
  browser.addCommand("parentSuite", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.PARENT_SUITE, value);
  });
  browser.addCommand("subSuite", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.SUB_SUITE, value);
  });
  browser.addCommand("owner", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.OWNER, value);
  });
  browser.addCommand("severity", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.SEVERITY, value);
  });
  browser.addCommand("tag", async (id: string, value: string) => {
    await addLabel(testIdFactory(id), LabelName.TAG, value);
  });
  browser.addCommand("issue", async (id: string, name: string, url: string) => {
    await addLink(testIdFactory(id), url, name, LinkType.ISSUE);
  });
  browser.addCommand("tms", async (id: string, name: string, url: string) => {
    await addLink(testIdFactory(id), url, name, LinkType.TMS);
  });
  browser.addCommand("attach", async (id: string, source: string, mimetype: string) => {
    await addAttachment(testIdFactory(id), source, mimetype);
  });
  browser.addCommand("step", async (id: string, name: string, body: StepBodyFunction) => {
    const step = new AllureCommandStepExecutable(name);

    await step.run(body, async (message: MetadataMessage) => await sendMetadata(testIdFactory(id), message));
  });
  browser.addCommand("displayName", async (id: string, value: string) => {
    await setDisplayName(testIdFactory(id), value);
  });
  browser.addCommand("description", async (id: string, value: string) => {
    await setDescription(testIdFactory(id), value);
  });
  browser.addCommand("descriptionHtml", async (id: string, value: string) => {
    await setDescriptionHtml(testIdFactory(id), value);
  });
  browser.addCommand("testCaseId", async (id: string, value: string) => {
    await setTestCaseId(testIdFactory(id), value);
  });
  browser.addCommand("historyId", async (id: string, value: string) => {
    await setHistoryId(testIdFactory(id), value);
  });
};

const hermioneAllureReporter = (hermione: Hermione, opts?: AllureReportOptions) => {
  const runningTests: Map<string, AllureTest> = new Map();
  const browsers: Map<string, any> = new Map();
  const allureWriter = opts?.writer;
  const resultsDir = allureReportFolder(opts?.resultsDir);
  const runtime = new AllureRuntime({ resultsDir, writer: allureWriter });
  /**
   * Create Allure test from Hermione test object with all the possible initial labels
   *
   * @param test Hermione test object
   * @returns Allure test
   */
  const createAllureTest = (test: Hermione.Test): AllureTest => {
    const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env;
    const thread = ALLURE_THREAD_NAME || test.sessionId;
    const hostnameLabel = ALLURE_HOST_NAME || hostname;
    const fileSrcPath = getFileSrcPath(test.file!);
    const testFullTitle = test.fullTitle();
    const currentTest = new AllureTest(runtime, Date.now());
    const suites = getSuitePath(test);

    currentTest.name = test.title;
    currentTest.fullName = testFullTitle;
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.HOST, hostnameLabel);
    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.FRAMEWORK, "hermione");
    currentTest.addParameter("browser", test.browserId);

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
  const handleTestError = (test: Hermione.Test, error: Hermione.TestError) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId())!;
    const { message, stack, screenshot } = error;

    currentTest.detailsMessage = message;
    currentTest.detailsTrace = stack;

    if (screenshot) {
      const attachmentFilename = runtime.writeAttachment(screenshot.base64, ContentType.PNG, "base64");

      currentTest.addAttachment(
        // TODO: do we need to give the file much more exact name?
        "Screenshot",
        {
          contentType: ContentType.PNG,
        },
        attachmentFilename,
      );
    }
  };
  const handleAllureAttachment = (testId: string, metadata: MetadataMessage) => {
    const currentTest = runningTests.get(testId);

    if (!currentTest) {
      // eslint-disable-next-line no-console
      console.error("Can't assign attachment due test has been finished or hasn't been started");
      return;
    }

    currentTest.applyMetadata(metadata);
  };

  hermione.on(hermione.events.SESSION_START, (browser, { browserId }) => {
    const testIdFactory = getTestId(browserId);

    browsers.set(browserId, browser);

    addCommands(browser, testIdFactory);
  });
  hermione.on(hermione.events.NEW_WORKER_PROCESS, (worker) => {
    // eslint-disable-next-line
    // @ts-ignore
    worker._process.on("message", (message) => {
      if (message?.type === ALLURE_METADATA_CONTENT_TYPE) {
        const { testId, metadata } = message as HermioneAttachmentMessage;

        handleAllureAttachment(testId, metadata);
      }
    });
  });
  hermione.on(hermione.events.TEST_BEGIN, (test) => {
    // test hasn't been actually started
    if (!test.browserId) {
      return;
    }

    const testId = getTestId(test);
    const browser = browsers.get(test.browserId);

    if (browser) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      addCommands(browser, testId);
    }

    const currentTest = createAllureTest(test);

    runningTests.set(testId(), currentTest);
  });
  hermione.on(hermione.events.TEST_PASS, (test) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId())!;

    currentTest.status = Status.PASSED;
  });
  hermione.on(hermione.events.TEST_FAIL, (test) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId());

    // hermione handle all errors in this hook, even test hasn't been started
    if (!currentTest) {
      throw test.err;
    }

    currentTest.status = Status.FAILED;
  });
  hermione.on(hermione.events.TEST_END, (test) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId())!;

    if (test.err) {
      handleTestError(test, test.err);
    }

    currentTest.calculateHistoryId();

    // the test has been skipped
    if (test.pending) {
      currentTest.status = Status.SKIPPED;
    }

    currentTest.stage = Stage.FINISHED;
    currentTest.endTest(Date.now());
    runningTests.delete(testId());
  });

  // it needs for tests because we need to read runtime writer data redefined in hermione config
  // eslint-disable-next-line
  // @ts-ignore
  hermione.allure = runtime;
};

module.exports = hermioneAllureReporter;
