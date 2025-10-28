import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions } from "allure-js-commons";
import { Status } from "allure-js-commons";
import { getMessageAndTraceFromError } from "allure-js-commons/sdk";
import type { TestRuntime } from "allure-js-commons/sdk/runtime";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { AllureCypressTaskArgs, CypressMessage } from "../types.js";
import { enqueueRuntimeMessage, getRuntimeMessages, setRuntimeMessages } from "./state.js";
import { ALLURE_STEP_CMD_SUBJECT, startAllureApiStep, stopCurrentAllureApiStep } from "./steps.js";
import { uint8ArrayToBase64 } from "./utils.js";

export const initTestRuntime = () => setGlobalTestRuntime(new AllureCypressTestRuntime() as TestRuntime);

export const getTestRuntime = () => getGlobalTestRuntime() as AllureCypressTestRuntime;

class AllureCypressTestRuntime implements TestRuntime {
  constructor() {
    this.#resetMessages();
  }

  labels(...labels: Label[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  links(...links: Link[]) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  parameter(name: string, value: string, options?: ParameterOptions) {
    return this.#enqueueMessageAsync({
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
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  descriptionHtml(html: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  displayName(name: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  historyId(value: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  testCaseId(value: string) {
    return this.#enqueueMessageAsync({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  // @ts-ignore
  attachment(name: string, content: string, options: AttachmentOptions) {
    // @ts-ignore
    const attachmentRawContent: string | Uint8Array = content?.type === "Buffer" ? content.data : content;
    const actualEncoding = typeof attachmentRawContent === "string" ? "utf8" : "base64";
    const attachmentContent = uint8ArrayToBase64(attachmentRawContent);

    return this.#enqueueMessageAsync({
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
    return this.#enqueueMessageAsync({
      type: "attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  logStep(name: string, status: Status = Status.PASSED, error?: Error): PromiseLike<void> {
    if (this.#isInOriginContext()) {
      startAllureApiStep(name);
      stopCurrentAllureApiStep(status, error ? getMessageAndTraceFromError(error) : undefined);
      return Cypress.Promise.resolve();
    }

    return cy
      .wrap(ALLURE_STEP_CMD_SUBJECT, { log: false })
      .then(() => {
        startAllureApiStep(name);
        return Cypress.Promise.resolve();
      })
      .then(() => {
        stopCurrentAllureApiStep(status, error ? getMessageAndTraceFromError(error) : undefined);
        return Cypress.Promise.resolve();
      });
  }

  step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    return cy
      .wrap(ALLURE_STEP_CMD_SUBJECT, { log: false })
      .then(() => {
        startAllureApiStep(name);
        return Cypress.Promise.resolve(body());
      })
      .then((result) => {
        stopCurrentAllureApiStep();
        return result;
      });
  }

  stepDisplayName(name: string) {
    return this.#enqueueMessageAsync({
      type: "step_metadata",
      data: {
        name,
      },
    });
  }

  stepParameter(name: string, value: string, mode?: ParameterMode) {
    return this.#enqueueMessageAsync({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  flushAllureMessagesToTask(taskName: string) {
    const messages = this.#dequeueAllMessages();
    if (messages.length) {
      cy.task(taskName, { absolutePath: Cypress.spec.absolute, messages }, { log: false });
    }
  }

  flushAllureMessagesToTaskAsync(taskName: string): Cypress.Chainable<unknown> | undefined {
    const messages = this.#dequeueAllMessages();
    if (messages.length) {
      const args: AllureCypressTaskArgs = {
        absolutePath: Cypress.spec.absolute,
        messages,
        isInteractive: Cypress.config("isInteractive"),
      };
      return cy.task(taskName, args, { log: false });
    }
  }

  #resetMessages() {
    setRuntimeMessages([]);
  }

  #enqueueMessageAsync(message: CypressMessage): PromiseLike<void> {
    enqueueRuntimeMessage(message);
    return Cypress.Promise.resolve();
  }

  #dequeueAllMessages() {
    const messages = getRuntimeMessages();
    this.#resetMessages();
    return messages;
  }

  #isInOriginContext(): boolean {
    try {
      const hasOriginContext = !!(window as any).cypressOriginContext;
      const hasOriginWindow = !!(window as any).cypressOriginWindow;

      if (hasOriginContext || hasOriginWindow) {
        return true;
      }

      const baseUrl = Cypress.config("baseUrl");
      const currentOrigin = window.location.origin;

      if (baseUrl && currentOrigin !== baseUrl) {
        return true;
      }

      const cypressInstance = (window as any).Cypress;

      if (cypressInstance && cypressInstance.state && cypressInstance.state("origin")) {
        return true;
      }

      try {
        const cyExists = typeof cy !== "undefined";
        const cyTaskExists = typeof cy.task !== "undefined";

        // In cy.origin context, cy.task may not be available or may throw
        if (!cyExists || !cyTaskExists) {
          return true;
        }
      } catch (error) {
        return true;
      }

      return false;
    } catch (error) {
      return true;
    }
  }
}
