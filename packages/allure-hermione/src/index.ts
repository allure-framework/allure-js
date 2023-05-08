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

const hostname = os.hostname();

const hermioneAllureReporter = (hermione: Hermione, opts: AllureReportOptions) => {
  const runningTests: Map<string, AllureTest> = new Map();
  const runtime = new AllureRuntime({
    resultsDir: "allure-results",
    ...opts,
  });
  const getTestId = (test: Hermione.Test) => `${test.sessionId}:${test.id()}`;
  const handleTestError = (test: Hermione.Test, error: Hermione.TestError) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId)!;
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

  hermione.on(hermione.events.NEW_BROWSER, (browser) => {
    browser.addCommand("label", async (testId: string, name: string, value: string) => {
      await addLabel(testId, name, value);
    });
    browser.addCommand(
      "link",
      async (testId: string, url: string, name?: string, type?: string) => {
        await addLink(testId, url, name, type);
      },
    );
    browser.addCommand(
      "parameter",
      async (testId: string, name: string, value: string, options?: ParameterOptions) => {
        await addParameter(testId, name, value, options);
      },
    );
    browser.addCommand("id", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.ALLURE_ID, value);
    });
    browser.addCommand("epic", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.EPIC, value);
    });
    browser.addCommand("feature", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.FEATURE, value);
    });
    browser.addCommand("story", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.STORY, value);
    });
    browser.addCommand("suite", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.SUITE, value);
    });
    browser.addCommand("parentSuite", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.PARENT_SUITE, value);
    });
    browser.addCommand("subSuite", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.SUB_SUITE, value);
    });
    browser.addCommand("owner", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.OWNER, value);
    });
    browser.addCommand("severity", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.SEVERITY, value);
    });
    browser.addCommand("tag", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.TAG, value);
    });
    browser.addCommand("issue", async (testId: string, name: string, url: string) => {
      await addLink(testId, url, name, LinkType.ISSUE);
    });
    browser.addCommand("tms", async (testId: string, name: string, url: string) => {
      await addLink(testId, url, name, LinkType.TMS);
    });
    browser.addCommand("attach", async (testId: string, source: string, mimetype: string) => {
      await addAttachment(testId, source, mimetype);
    });
    browser.addCommand("step", async (testId: string, name: string, body: StepBodyFunction) => {
      const step = new AllureCommandStepExecutable(name);
      await step.run(body, async (message: MetadataMessage) => await sendMetadata(testId, message));
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
  hermione.on(hermione.events.TEST_BEGIN, (test) => {
    const testId = getTestId(test);
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
    currentTest.addLabel(LabelName.THREAD, thread);

    if (parentSuite) {
      currentTest.addLabel(LabelName.PARENT_SUITE, parentSuite);
    }

    if (suite) {
      currentTest.addLabel(LabelName.SUITE, suite);
    }

    if (subSuites.length > 0) {
      currentTest.addLabel(LabelName.SUB_SUITE, subSuites.join(" > "));
    }

    runningTests.set(testId, currentTest);
  });
  hermione.on(hermione.events.TEST_PASS, (test) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId)!;

    currentTest.status = Status.PASSED;
  });
  hermione.on(hermione.events.TEST_FAIL, (test) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId);

    // hermione handle all errors in this hook, even test hasn't been started
    if (!currentTest) {
      throw test.err;
    }

    currentTest.status = Status.FAILED;
  });
  hermione.on(hermione.events.TEST_END, (test) => {
    const testId = getTestId(test);
    const currentTest = runningTests.get(testId)!;

    if (test.err) {
      handleTestError(test, test.err);
    }

    currentTest.stage = Stage.FINISHED;
    currentTest.endTest(Date.now());
    runningTests.delete(testId);
  });

  // it needs for tests because we need to read runtime writer data redefined in hermione config
  // eslint-disable-next-line
  // @ts-ignore
  hermione.allure = runtime;
};

module.exports = hermioneAllureReporter;
