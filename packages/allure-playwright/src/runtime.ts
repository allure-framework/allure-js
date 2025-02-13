import { test } from "@playwright/test";
import type { AttachmentOptions, ParameterMode, StepContext } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class AllurePlaywrightTestRuntime extends MessageTestRuntime {
  constructor() {
    super();
  }

  async step(stepName: string, body: () => any) {
    return await test.step(stepName, async () => await body());
  }

  async stepDisplayName(name: string) {
    await test.info().attach("Allure Step Metadata", {
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(
        JSON.stringify({
          type: "step_metadata",
          data: {
            name,
          },
        }),
        "utf8",
      ),
    });
  }

  async stepParameter(name: string, value: string, mode?: ParameterMode) {
    await test.info().attach("Allure Step Metadata", {
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(
        JSON.stringify({
          type: "step_metadata",
          data: {
            parameters: [{ name, value, mode }],
          },
        }),
        "utf8",
      ),
    });
  }

  async attachment(name: string, content: Buffer | string, options: AttachmentOptions) {
    await test.info().attach(name, { body: content, contentType: options.contentType });
  }

  async attachmentFromPath(name: string, path: string, options: AttachmentOptions) {
    await test.info().attach(name, { path, contentType: options.contentType });
  }

  async sendMessage(message: RuntimeMessage) {
    await test.info().attach(`Allure Metadata (${message.type})`, {
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(message), "utf8"),
    });
  }
}
