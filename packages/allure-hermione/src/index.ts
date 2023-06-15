/* eslint no-underscore-dangle: 0 */
/* eslint import/order: 0 */
import * as os from "node:os";
import * as process from "node:process";
import Hermione from "hermione";
import {
  AllureCommandStepExecutable,
  AllureRuntime,
  AllureTest,
  ContentType,
  LabelName,
  LinkType,
  md5,
  MetadataMessage,
  ParameterOptions,
  Stage,
  Status,
  StepBodyFunction,
  StepMetadata,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";
import {
  addAttachment,
  addLabel,
  addLink,
  addParameter,
  getSuitePath,
  sendMetadata,
} from "./utils";

export type HermioneAttachmentMessage = {
  testId: string;
  metadata: MetadataMessage;
};

export type AllureReportOptions = {
  resultsDir?: string;
};

export type TestIDFactory = (testId?: string) => string;

const hostname = os.hostname();

const hermioneAllureReporter = (hermione: Hermione, opts: AllureReportOptions) => {
  const loadedTests: Map<string, Hermione.Test> = new Map();
  const runningTests: Map<string, AllureTest> = new Map();
  const runtime = new AllureRuntime({
    resultsDir: "allure-results",
    ...opts,
  });
  /**
   * Creates browser-specific test ID to identify test in the reporter
   *
   * @param context Hermione test object, or browser ID string
   * @returns Browser-specific test ID factory function
   */
  const getTestId = (context: string | Hermione.Test): TestIDFactory => {
    if (typeof context === "string") {
      return (testId?: string) => `${context}:${testId || ""}`;
    }

    return () => `${context.browserId}:${context.id()}`;
  };
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
    const currentTest = new AllureTest(runtime, Date.now());
    const [parentSuite, suite, ...subSuites] = getSuitePath(test);

    currentTest.name = test.title;
    currentTest.fullName = test.fullTitle();
    currentTest.historyId = md5(test.fullTitle());
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.HOST, hostnameLabel);
    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.FRAMEWORK, "hermione");
    currentTest.addParameter("browser", test.browserId);

    if (thread) {
      currentTest.addLabel(LabelName.THREAD, thread);
    }

    if (parentSuite) {
      currentTest.addLabel(LabelName.PARENT_SUITE, parentSuite);
    }

    if (suite) {
      currentTest.addLabel(LabelName.SUITE, suite);
    }

    if (subSuites.length > 0) {
      currentTest.addLabel(LabelName.SUB_SUITE, subSuites.join(" > "));
    }

    return currentTest;
  };
  const handleTestError = (test: Hermione.Test, error: Hermione.TestError) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId())!;
    const { message, stack, screenshot } = error;

    currentTest.detailsMessage = message;
    currentTest.detailsTrace = stack;

    if (screenshot) {
      const attachmentFilename = runtime.writeAttachment(
        screenshot.base64,
        ContentType.PNG,
        "base64",
      );

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
      throw new Error("Can't set test metadata due browser session has been finished");
    }

    const {
      attachments = [],
      labels = [],
      links = [],
      parameter = [],
      steps = [],
      description,
      descriptionHtml,
    } = metadata;

    labels.forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });
    links.forEach((link) => {
      currentTest.addLink(link.url, link.name, link.type);
    });
    parameter.forEach((param) => {
      currentTest.addParameter(param.name, param.value, {
        excluded: param.excluded,
        mode: param.mode,
      });
    });
    attachments.forEach((attachment) => {
      const attachmentFilename = runtime.writeAttachment(
        attachment.content,
        attachment.type,
        attachment.encoding,
      );

      currentTest.addAttachment(
        "Attachment",
        {
          contentType: attachment.type,
        },
        attachmentFilename,
      );
    });

    steps.forEach((step) => {
      handleAllureStep(testId, step);
    });

    if (description) {
      currentTest.description = description;
    }

    if (descriptionHtml) {
      currentTest.descriptionHtml = descriptionHtml;
    }
  };
  const handleAllureStep = (testId: string, stepMetadata: StepMetadata) => {
    const currentTest = runningTests.get(testId);

    if (!currentTest) {
      throw new Error("Can't set test metadata due browser session has been finished");
    }

    const step = AllureCommandStepExecutable.toExecutableItem(runtime, stepMetadata);

    currentTest.addStep(step);
  };

  hermione.on(hermione.events.NEW_BROWSER, (browser, { browserId }) => {
    const testId = getTestId(browserId);

    browser.addCommand("label", async (id: string, name: string, value: string) => {
      await addLabel(testId(id), name, value);
    });
    browser.addCommand("link", async (id: string, url: string, name?: string, type?: string) => {
      await addLink(testId(id), url, name, type);
    });
    browser.addCommand(
      "parameter",
      async (id: string, name: string, value: string, options?: ParameterOptions) => {
        await addParameter(testId(id), name, value, options);
      },
    );
    browser.addCommand("id", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.ALLURE_ID, value);
    });
    browser.addCommand("epic", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.EPIC, value);
    });
    browser.addCommand("feature", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.FEATURE, value);
    });
    browser.addCommand("story", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.STORY, value);
    });
    browser.addCommand("suite", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.SUITE, value);
    });
    browser.addCommand("parentSuite", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.PARENT_SUITE, value);
    });
    browser.addCommand("subSuite", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.SUB_SUITE, value);
    });
    browser.addCommand("owner", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.OWNER, value);
    });
    browser.addCommand("severity", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.SEVERITY, value);
    });
    browser.addCommand("tag", async (id: string, value: string) => {
      await addLabel(testId(id), LabelName.TAG, value);
    });
    browser.addCommand("issue", async (id: string, name: string, url: string) => {
      await addLink(testId(id), url, name, LinkType.ISSUE);
    });
    browser.addCommand("tms", async (id: string, name: string, url: string) => {
      await addLink(testId(id), url, name, LinkType.TMS);
    });
    browser.addCommand("attach", async (id: string, source: string, mimetype: string) => {
      await addAttachment(testId(id), source, mimetype);
    });
    browser.addCommand("step", async (id: string, name: string, body: StepBodyFunction) => {
      const step = new AllureCommandStepExecutable(name);
      await step.run(
        body,
        async (message: MetadataMessage) => await sendMetadata(testId(id), message),
      );
    });
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
  hermione.on(hermione.events.AFTER_TESTS_READ, (collection) => {
    // cache all the tests to handle skipped tests in future
    collection.eachTest((test) => {
      const testId = getTestId(test);

      loadedTests.set(testId(), test);
    });
  });
  hermione.on(hermione.events.TEST_BEGIN, (test) => {
    // test hasn't been actually started
    if (!test.sessionId) {
      return;
    }

    const testId = getTestId(test);
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
    // test hasn't been started
    if (!test.startTime) {
      return;
    }

    const testId = getTestId(test);
    const currentTest = runningTests.get(testId())!;

    if (test.err) {
      handleTestError(test, test.err);
    }

    currentTest.stage = Stage.FINISHED;
    currentTest.endTest(Date.now());
    loadedTests.delete(testId());
    runningTests.delete(testId());
  });
  hermione.on(hermione.events.END, () => {
    // all tests have been finished
    if (loadedTests.size === 0) {
      return;
    }

    loadedTests.forEach((test) => {
      const currentTest = createAllureTest(test);

      currentTest.status = Status.SKIPPED;
      currentTest.stage = Stage.FINISHED;
      currentTest.endTest();
    });
  });

  // it needs for tests because we need to read runtime writer data redefined in hermione config
  // eslint-disable-next-line
  // @ts-ignore
  hermione.allure = runtime;
};

module.exports = hermioneAllureReporter;
