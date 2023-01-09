/* eslint no-underscore-dangle: 0 */
/* eslint import/order: 0 */
import * as os from "node:os";
import * as process from "node:process";
import Hermione from "hermione";
import {
  AllureResults,
  AllureRuntime,
  AllureTest,
  Attachment,
  AttachmentMetadata,
  LabelName,
  LinkType,
  ParameterOptions,
  Stage,
  Status,
  TestResult,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";

export interface AllureInMemoryWriter {
  results: TestResult[];
  attachments: Attachment[];
  writeResult: (result: AllureResults) => void;
  writeAttachment: (name: string, content: string, type: string) => void;
}

export interface HermioneAllureRuntime extends Omit<AllureRuntime, "writer"> {
  writer: AllureInMemoryWriter;
}

export interface HermioneAllure extends Hermione {
  allure: HermioneAllureRuntime;
}

export type HermioneAttachment = {
  source: string;
  mimetype: string;
  encoding: BufferEncoding;
};

export type HermioneAttachmentMetadata = AttachmentMetadata & {
  attachment?: HermioneAttachment[];
};

export type HermioneAttachmentMessage = {
  testId: string;
  metadata: HermioneAttachmentMetadata;
};

export type AllureReportOptions = {
  resultsDir?: string;
};

export const getSuitePath = (test: Hermione.Test): string[] => {
  const path = [];
  let currentSuite = test.parent as Hermione.Suite;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent as Hermione.Suite;
  }

  return path;
};

const runningTests: Map<string, AllureTest> = new Map();

const hermioneAllureReporter = (hermione: HermioneAllure, opts: AllureReportOptions) => {
  const runtime = new AllureRuntime({
    resultsDir: "allure-results",
    ...opts,
  });
  // FIXME: after the PR will be merged
  // eslint-disable-next-line
  // @ts-ignore
  const handleTestError = (test: Hermione.Test, error: Hermione.TestError) => {
    const currentTest = runningTests.get(test.id()) as AllureTest;
    const { message, stack, screenshot } = error;

    currentTest.detailsMessage = message;
    currentTest.detailsTrace = stack;

    if (screenshot) {
      const attachmentFilename = runtime.writeAttachment(screenshot.base64, "image/png", "base64");

      currentTest.addAttachment(
        "Screenshot",
        {
          contentType: "image/png",
        },
        attachmentFilename,
      );
    }
  };
  const handleAllureAttachment = (testId: string, metadata: HermioneAttachmentMetadata) => {
    const currentTest = runningTests.get(testId);

    if (!currentTest) {
      throw new Error("Can't set test metadata due browser session has been finished");
    }

    const { labels = [], links = [], attachment = [], parameter = [] } = metadata;

    labels.forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });
    links.forEach((link) => {
      currentTest.addLink(link.url, link.name, link.type);
    });
    parameter.forEach((param) => {
      currentTest.addParameter(param.name, param.value, {
        excluded: param.excluded,
        hidden: param.hidden,
      });
    });
    attachment.forEach((file) => {
      const attachmentFilename = runtime.writeAttachment(file.source, file.mimetype, file.encoding);

      currentTest.addAttachment(
        "Attachment",
        {
          contentType: file.mimetype,
        },
        attachmentFilename,
      );
    });
  };
  const sendMetadata = async (testId: string, metadata: HermioneAttachmentMetadata) =>
    new Promise((resolve, reject) => {
      process.send?.(
        {
          type: ALLURE_METADATA_CONTENT_TYPE,
          testId,
          metadata,
        },
        undefined,
        undefined,
        (err) => {
          if (err) {
            return reject(err);
          }

          return resolve(true);
        },
      );
    });
  const addLabel = async (testId: string, name: string, value: string) => {
    await sendMetadata(testId, {
      labels: [{ name, value }],
    });
  };
  const addLink = async (testId: string, url: string, name?: string, type?: string) => {
    await sendMetadata(testId, {
      links: [{ name, url, type }],
    });
  };
  const addParameter = async (
    testId: string,
    name: string,
    value: string,
    options?: ParameterOptions,
  ) => {
    await sendMetadata(testId, {
      parameter: [{ name, value, ...options }],
    });
  };
  const addAttachment = async (testId: string, source: string, mimetype: string) => {
    const encoding = /(text|application)/.test(mimetype) ? "utf8" : "base64";

    await sendMetadata(testId, {
      attachment: [{ source, mimetype, encoding }],
    });
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
    const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env;
    const thread = ALLURE_THREAD_NAME || test.sessionId;
    const hostname = ALLURE_HOST_NAME || os.hostname();
    const currentTest = new AllureTest(runtime, Date.now());
    const [parentSuite, suite, ...subSuites] = getSuitePath(test);

    currentTest.name = test.title;
    currentTest.fullName = test.fullTitle();
    // TODO: do we need history ID here?
    // currentTest.historyId = md5(currentTest.fullName);
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.HOST, hostname);
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

    runningTests.set(test.id(), currentTest);
  });
  hermione.on(hermione.events.TEST_PASS, (test) => {
    const currentTest = runningTests.get(test.id());

    if (!currentTest) {
      throw new Error("There isn't running test for the current session!");
    }

    currentTest.status = Status.PASSED;
  });
  // TODO: do we need to handle this?
  // hermione.on(hermione.events.RETRY, (test) => {
  // });
  hermione.on(hermione.events.TEST_FAIL, (test) => {
    const currentTest = runningTests.get(test.id());

    if (!currentTest) {
      throw new Error("There isn't running test for the current session!");
    }

    currentTest.status = Status.FAILED;
  });
  hermione.on(hermione.events.TEST_END, (test) => {
    const currentTest = runningTests.get(test.id());

    if (!currentTest) {
      throw new Error("There isn't running test for the current session!");
    }

    if (test.err) {
      handleTestError(test, test.err);
    }

    currentTest.stage = Stage.FINISHED;
    currentTest.endTest(Date.now());
    runningTests.delete(test.id());
  });

  // it needs for tests because we need to read runtime writer data redefined in hermione config
  // eslint-disable-next-line
  // @ts-ignore
  hermione.allure = runtime;
};

module.exports = hermioneAllureReporter;
