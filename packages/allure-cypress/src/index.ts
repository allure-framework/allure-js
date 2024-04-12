import {
  ContentType,
  LabelName,
  LinkType,
  ParameterMode,
  ParameterOptions,
  RuntimeMessage,
  Stage,
  Status,
  TestRuntime,
  getGlobalTestRuntime,
  getUnfinishedStepsMessages,
  hasStepMessage,
  setGlobalTestRuntime,
} from "allure-js-commons/new/sdk/browser";
import { CypressRuntimeMessage } from "./model.js";
import { normalizeAttachmentContentEncoding, uint8ArrayToBase64 } from "./utils.js";

export class AllureCypressTestRuntime implements TestRuntime {
  label(name: LabelName | string, value: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        labels: [{ name, value }],
      },
    });
  }

  link(url: string, type?: LinkType | string, name?: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        links: [{ type, url, name }],
      },
    });
  }

  parameter(name: string, value: string, options?: ParameterOptions) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        parameters: [
          {
            name,
            value,
            ...options,
          },
        ],
      },
    });
  }

  description(markdown: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  descriptionHtml(html: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  displayName(name: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  historyId(value: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  testCaseId(value: string) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  attachment(name: string, content: Buffer | string, type: string | ContentType) {
    // @ts-ignore
    const attachmentRawContent: string | Uint8Array = content?.type === "Buffer" ? content.data : content;
    const encoding = content instanceof Buffer ? "base64" : "utf-8";
    const actualEncoding = normalizeAttachmentContentEncoding(attachmentRawContent, encoding);
    const attachmentContent = uint8ArrayToBase64(attachmentRawContent);

    return this.sendMessageAsync({
      type: "raw_attachment",
      data: {
        content: attachmentContent,
        encoding: actualEncoding,
        contentType: type,
        name,
      },
    });
  }

  step(name: string, body: () => void | PromiseLike<void>) {
    return cy
      .wrap(null, { log: false })
      .then(() => {
        this.sendMessage({
          type: "step_start",
          data: { name, start: Date.now() },
        });

        return body() || Cypress.Promise.resolve();
      })
      .then(() => {
        return this.sendMessageAsync({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stage: Stage.FINISHED,
            stop: Date.now(),
          },
        });
      });
  }

  stepDisplayName(name: string) {
    return this.sendMessageAsync({
      type: "step_metadata",
      data: { name },
    });
  }

  stepParameter(name: string, value: string, mode?: ParameterMode) {
    return this.sendMessageAsync({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  sendMessage(message: CypressRuntimeMessage) {
    const messages = Cypress.env("allureRuntimeMessages") || [];

    Cypress.env("allureRuntimeMessages", messages.concat(message));
  }

  sendMessageAsync(message: CypressRuntimeMessage): PromiseLike<void> {
    this.sendMessage(message);
    return Cypress.Promise.resolve();
  }
}

const { EVENT_TEST_BEGIN, EVENT_TEST_FAIL, EVENT_TEST_PASS } = Mocha.Runner.constants;

const getSuitePath = (test: Mocha.Test): string[] => {
  const path: string[] = [];
  let currentSuite: Mocha.Suite | undefined = test.parent;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent;
  }

  return path;
};

// @ts-ignore
Cypress.mocha
  .getRunner()
  .on(EVENT_TEST_BEGIN, (test: Mocha.Test) => {
    const testRuntime = new AllureCypressTestRuntime();

    Cypress.env("allureRuntimeMessages", []);

    testRuntime.sendMessage({
      type: "cypress_start",
      data: {
        isInteractive: Cypress.config("isInteractive"),
        absolutePath: Cypress.spec.absolute,
        specPath: getSuitePath(test).concat(test.title),
        filename: Cypress.spec.relative,
        start: Date.now(),
      },
    });

    setGlobalTestRuntime(testRuntime);
  })
  .on(EVENT_TEST_PASS, () => {
    const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
    const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];
    const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages as RuntimeMessage[]);

    unfinishedStepsMessages.forEach(() => {
      testRuntime.sendMessage({
        type: "step_stop",
        data: {
          stage: Stage.FINISHED,
          status: Status.PASSED,
          stop: Date.now(),
        },
      });
    });
    testRuntime.sendMessage({
      type: "cypress_end",
      data: {
        stage: Stage.FINISHED,
        status: Status.PASSED,
        stop: Date.now(),
      },
    });
  })
  .on(EVENT_TEST_FAIL, (test: Mocha.Test, err: Error) => {
    const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

    testRuntime.sendMessage({
      type: "cypress_end",
      data: {
        stage: Stage.FINISHED,
        status: err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN,
        statusDetails: {
          message: err.message,
          trace: err.stack,
        },
        stop: Date.now(),
      },
    });
  });

Cypress.Screenshot.defaults({
  onAfterScreenshot: (_, details) => {
    const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;

    testRuntime.sendMessage({
      type: "cypress_screenshot",
      data: {
        path: details.path,
        name: details.name || "Screenshot",
      },
    });
  },
});
Cypress.on("fail", (err) => {
  const testRuntime = getGlobalTestRuntime() as AllureCypressTestRuntime;
  const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];
  const hasSteps = hasStepMessage(runtimeMessages as RuntimeMessage[]);

  // if there is no steps, don't handle the error
  if (!hasSteps) {
    throw err;
  }

  const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages as RuntimeMessage[]);

  if (unfinishedStepsMessages.length === 0) {
    throw err;
  }

  const failedStepsStatus = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

  unfinishedStepsMessages.forEach(() => {
    testRuntime.sendMessage({
      type: "step_stop",
      data: {
        stage: Stage.FINISHED,
        status: failedStepsStatus,
        stop: Date.now(),
        statusDetails: {
          message: err.message,
          trace: err.stack,
        },
      },
    });
  });

  throw err;
});

afterEach(() => {
  const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];

  cy.task("allureReportTest", runtimeMessages, { log: false });
});
