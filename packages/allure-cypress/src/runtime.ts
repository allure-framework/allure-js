import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions } from "allure-js-commons";
import { Status } from "allure-js-commons";
import { getMessageAndTraceFromError } from "allure-js-commons/sdk";
import type { TestRuntime } from "allure-js-commons/sdk/runtime";
import { getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { CypressMessage } from "./model.js";
import { ALLURE_REPORT_STEP_COMMAND } from "./model.js";
import { uint8ArrayToBase64 } from "./utils.js";

export class AllureCypressTestRuntime implements TestRuntime {

  constructor() {
    this.#resetMessages();
  }

  labels(...labels: Label[]) {
    return this.enqueueMessageAsync({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  links(...links: Link[]) {
    return this.enqueueMessageAsync({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  parameter(name: string, value: string, options?: ParameterOptions) {
    return this.enqueueMessageAsync({
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
    return this.enqueueMessageAsync({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  descriptionHtml(html: string) {
    return this.enqueueMessageAsync({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  displayName(name: string) {
    return this.enqueueMessageAsync({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  historyId(value: string) {
    return this.enqueueMessageAsync({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  testCaseId(value: string) {
    return this.enqueueMessageAsync({
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

    return this.enqueueMessageAsync({
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
    return this.enqueueMessageAsync({
      type: "attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  logStep(name: string, status: Status = Status.PASSED, error?: Error) {
    return cy
      .wrap(ALLURE_REPORT_STEP_COMMAND, { log: false })
      .then(() => {
        this.enqueueMessageAsync({
          type: "step_start",
          data: {
            name,
            start: Date.now(),
          },
        });

        return Cypress.Promise.resolve();
      })
      .then(() => {
        return this.enqueueMessageAsync({
          type: "step_stop",
          data: {
            status: status,
            stop: Date.now(),
            statusDetails: error ? { ...getMessageAndTraceFromError(error) } : undefined,
          },
        });
      });
  }

  step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    return cy
      .wrap(ALLURE_REPORT_STEP_COMMAND, { log: false })
      .then(() => {
        this.enqueueMessageAsync({
          type: "step_start",
          data: {
            name,
            start: Date.now(),
          },
        });

        return Cypress.Promise.resolve(body());
      })
      .then((result) => {
        return this.enqueueMessageAsync({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stop: Date.now(),
          },
        }).then(() => result);
      });
  }

  stepDisplayName(name: string) {
    return this.enqueueMessageAsync({
      type: "step_metadata",
      data: {
        name,
      },
    });
  }

  stepParameter(name: string, value: string, mode?: ParameterMode) {
    return this.enqueueMessageAsync({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  messages = () => Cypress.env("allureRuntimeMessages") as CypressMessage[] ?? [];

  enqueueMessage = ({ data, ...rest }: CypressMessage) => {
    const messages = Cypress.env("allureRuntimeMessages") || [];

    Cypress.env("allureRuntimeMessages", messages.concat({
      data: {
        ...data,
        // a little hack to avoid additional types definition
        // @ts-ignore
        cypressTestId: Cypress.state("test")?.id ?? "",
      },
      ...rest,
    }));
  };

  enqueueMessageAsync = (message: CypressMessage): PromiseLike<void> => {
    this.enqueueMessage(message);
    return Cypress.Promise.resolve();
  };

  reportMessages = (): PromiseLike<void> => cy.task(
    "reportAllureRuntimeMessages",
    { absolutePath: Cypress.spec.absolute, messages: this.#dequeueAllMessages() },
    { log: false },
  );

  #resetMessages = () => {
    Cypress.env("allureRuntimeMessages", []);
  };

  #dequeueAllMessages = () => {
    const messages = this.messages();
    this.#resetMessages();
    return messages;
  };
}

export const initTestRuntime = () => setGlobalTestRuntime(new AllureCypressTestRuntime() as TestRuntime);

export const getTestRuntime = () => getGlobalTestRuntime() as AllureCypressTestRuntime;

export const getMessages = () => getTestRuntime().messages();

export const enqueueRuntimeMessages = (...messages: readonly CypressMessage[]) => {
  const testRuntime = getTestRuntime();
  messages.forEach((m) => testRuntime.enqueueMessage(m));
};

export const reportRuntimeMessages = () => getTestRuntime().reportMessages();
