import * as os from "node:os";
import * as process from "node:process"
import { AttachmentMetadata, AllureRuntime, AllureTest, LabelName, LinkType, Stage, Status, ParameterOptions } from "allure-js-commons"
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";
import Hermione from "hermione";

export type HermioneAttachment = {
  source: string;
  mimetype: string;
  encoding: BufferEncoding;
}

export type HermioneAttachmentMetadata = AttachmentMetadata & {
  attachment?: HermioneAttachment[];
}

export type HermioneAttachmentMessage = {
  testId: string;
  metadata: HermioneAttachmentMetadata;
}

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

const runningTests: Map<string, AllureTest> = new Map()

const hermioneAllureReporter = (hermione: Hermione, opts: AllureReportOptions) => {
  const runtime = new AllureRuntime({
    resultsDir: "allure-results",
    ...opts
  })
  const handleTestError = (testResult: Hermione.TestResult, error: Error) => {
    const currentTest = runningTests.get(testResult.id()) as AllureTest
    // @ts-ignore
    const { message, stack, screenshot } = error

    currentTest.detailsMessage = message
    currentTest.detailsTrace = stack

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
  const handleAllureAttachment = (testId: string, metadata: HermioneAttachmentMetadata) => {
    const currentTest = runningTests.get(testId)

    if (!currentTest) {
      console.warn(`Can't set test metadata due browser session has been finished`)
      return
    }

    const { labels = [], links = [], attachment = [] } = metadata

    labels.forEach(label => {
      currentTest.addLabel(label.name, label.value)
    })
    links.forEach(link => {
      currentTest.addLink(link.url, link.url, link.type)
    })
    attachment.forEach(file => {
      const attachmentFilename = runtime.writeAttachment(file.source, file.mimetype, file.encoding);

      currentTest.addAttachment(
        "Attachment",
        {
          contentType: file.mimetype,
        },
        attachmentFilename
      )
    })
  }

  const sendMetadata = async (testId: string, metadata: HermioneAttachmentMetadata) => new Promise((resolve, reject) => {
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
        return reject(err)
      }

      return resolve(true)
    })
  })
  const addLabel = async (testId: string, name: string, value: string) => {
    await sendMetadata(testId, {
      labels: [
        { name, value }
      ],
    })
  }
  const addLink = async (testId: string, url: string, name?: string, type?: string) => {
    await sendMetadata(testId, {
      links: [
        { name, url, type }
      ],
    })
  }
  const addParameter = async (testId: string, name: string, value: string, options?: ParameterOptions) => {
    await sendMetadata(testId, {
      parameter: [
        { name, value, ...options }
      ],
    })
  }
  const addAttachment = async (testId: string, source: string, mimetype: string) => {
    const encoding = /(text|application)/.test(mimetype)
      ? "utf8"
      : "base64"

    await sendMetadata(testId, {
      attachment: [
        { source, mimetype, encoding }
      ]
    })
  }

  hermione.on(hermione.events.NEW_BROWSER, (browser) => {
    browser.addCommand("label", async (testId: string, name: string, value: string) => {
      await addLabel(testId, name, value)
    })
    browser.addCommand("link", async (testId: string, url: string, name?: string, type?: string) => {
      await addLink(testId, url, name, type)
    })
    browser.addCommand("parameter", async (testId: string, name: string, value: string, options?: ParameterOptions) => {
      await addParameter(testId, name, value, options)
    })
    browser.addCommand("epic", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.EPIC, value)
    })
    browser.addCommand("feature", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.FEATURE, value)
    })
    browser.addCommand("story", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.STORY, value)
    })
    browser.addCommand("suite", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.SUITE, value)
    })
    browser.addCommand("parentSuite", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.PARENT_SUITE, value)
    })
    browser.addCommand("subSuite", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.SUB_SUITE, value)
    })
    browser.addCommand("owner", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.OWNER, value)
    })
    browser.addCommand("severity", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.SEVERITY, value)
    })
    browser.addCommand("tag", async (testId: string, value: string) => {
      await addLabel(testId, LabelName.TAG, value)
    })
    browser.addCommand("issue", async (testId: string, name: string, url: string) => {
      await addLink(testId, url, name, LinkType.ISSUE)
    })
    browser.addCommand("tms", async (testId: string, name: string, url: string) => {
      await addLink(testId, url, name, LinkType.TMS)
    })
    browser.addCommand("attach", async (testId: string, source: string, mimetype: string) => {
      await addAttachment(testId, source, mimetype)
    })
  })

  hermione.on(hermione.events.NEW_WORKER_PROCESS, (worker) => {
    // @ts-ignore
    worker._process.on("message", (message) => {
      if (message?.type === ALLURE_METADATA_CONTENT_TYPE) {
        const { testId, metadata } = message as HermioneAttachmentMessage

        handleAllureAttachment(testId, metadata)
      }
    })
  })

  hermione.on(hermione.events.TEST_BEGIN, (testResult) => {
    const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = process.env
    const thread = ALLURE_THREAD_NAME || testResult.sessionId;
    const hostname = ALLURE_HOST_NAME || os.hostname()
    const currentTest = new AllureTest(runtime, Date.now())
    const [parentSuite, suite, ...subSuites] = getSuitePath(testResult);

    currentTest.name = testResult.title
    currentTest.fullName = testResult.fullTitle()
    // TODO:
    // currentTest.historyId = md5(currentTest.fullName);
    currentTest.stage = Stage.RUNNING

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

    runningTests.set(testResult.id(), currentTest)
  })
  hermione.on(hermione.events.TEST_PASS, (testResult) => {
    const currentTest = runningTests.get(testResult.id())

    if (!currentTest) {
      throw new Error("SUCCESS bla bla no test here")
    }

    currentTest.status = Status.PASSED
  });

  // TODO:
  // hermione.on(hermione.events.RETRY, (testResult) => {
  // });

  hermione.on(hermione.events.TEST_FAIL, (testResult) => {
    const currentTest = runningTests.get(testResult.id())

    if (!currentTest) {
      throw new Error("FAIL bla bla no test here")
    }

    currentTest.status = Status.FAILED
  });

  hermione.on(hermione.events.TEST_END, (testResult) => {
    const currentTest = runningTests.get(testResult.id())

    if (!currentTest) {
      throw new Error("FAIL bla bla no test here")
    }

    if (testResult.err) {
      handleTestError(testResult, testResult.err)
    }

    currentTest.stage = Stage.FINISHED
    currentTest.endTest(Date.now())
    runningTests.delete(testResult.id())
  })
};

module.exports = hermioneAllureReporter;
