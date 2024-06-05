import { ContentType, Stage, Status } from "allure-js-commons";
import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getUnfinishedStepsMessages, hasStepMessage } from "allure-js-commons/sdk";
import type { TestRuntime } from "allure-js-commons/sdk/runtime";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { CypressRuntimeMessage } from "./model.js";
import { getSuitePath, normalizeAttachmentContentEncoding, uint8ArrayToBase64 } from "./utils.js";

export class AllureCypressTestRuntime implements TestRuntime {
  labels(...labels: Label[]) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  links(...links: Link[]) {
    return this.sendMessageAsync({
      type: "metadata",
      data: {
        links,
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

  attachment(name: string, content: Buffer | string, options: AttachmentOptions) {
    // @ts-ignore
    const attachmentRawContent: string | Uint8Array = content?.type === "Buffer" ? content.data : content;
    const encoding = content instanceof Buffer ? "base64" : "utf-8";
    const actualEncoding = normalizeAttachmentContentEncoding(attachmentRawContent, encoding);
    const attachmentContent = uint8ArrayToBase64(attachmentRawContent);

    return this.sendMessageAsync({
      type: "attachment_content",
      data: {
        name,
        content: attachmentContent,
        encoding: actualEncoding,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  attachmentFromPath(name: string, path: string, options: Omit<AttachmentOptions, "encoding">) {
    return this.sendMessageAsync({
      type: "attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    return cy
      .wrap(null, { log: false })
      .then(() => {
        this.sendMessage({
          type: "step_start",
          data: { name, start: Date.now() },
        });

        return Cypress.Promise.resolve(body());
      })
      .then((result) => {
        return this.sendMessageAsync({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stage: Stage.FINISHED,
            stop: Date.now(),
          },
        }).then(() => result);
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

const initializeAllure = () => {
  const initialized = Cypress.env("allureInitialized") as boolean;

  if (initialized) {
    return;
  }

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

      return testRuntime.sendMessageAsync({
        type: "attachment_path",
        data: {
          path: details.path,
          name: details.name || "Screenshot",
          contentType: ContentType.PNG,
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

  Cypress.env("allureInitialized", true);
};

initializeAllure();

export * from "allure-js-commons";
