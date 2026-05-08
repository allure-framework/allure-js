import { test } from "@playwright/test";
import { Status, type AttachmentOptions, type ParameterMode } from "allure-js-commons";
import { getStatusFromError, isPromise, type RuntimeMessage } from "allure-js-commons/sdk";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/sdk/reporter";
import type { SyncTestRuntime } from "allure-js-commons/sdk/runtime";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

import {
  getPlaywrightInternals,
  type PlaywrightInternalAttachment,
  type PlaywrightInternalStep,
  type PlaywrightInternalTestInfo,
} from "./playwrightInternals.js";
import { ALLURE_STEP_STATUS_ANNOTATION } from "./syncAnnotations.js";

const toAttachmentBody = (content: Uint8Array | Buffer | string, encoding?: BufferEncoding) =>
  content instanceof Uint8Array
    ? Buffer.from(content)
    : typeof content === "string"
      ? Buffer.from(content, encoding)
      : content;

export class AllurePlaywrightTestRuntime extends MessageTestRuntime {
  private cachedPlaywrightSyncRuntime?: SyncTestRuntime;

  override get sync(): SyncTestRuntime {
    if (!this.cachedPlaywrightSyncRuntime) {
      const baseSyncRuntime = super.sync!;

      this.cachedPlaywrightSyncRuntime = {
        ...baseSyncRuntime,
        attachment: (name, content, options) => this.#attachContentSync(name, content, options),
        attachmentFromPath: (name, path, options) => this.#attachPathSync(name, path, options),
        logStep: (name, status = Status.PASSED, error) => this.#logStepSync(name, status, error),
        step: (name, body) => this.#stepSync(name, body),
        stepDisplayName: (name) => this.#attachStepMetadataSync({ name }),
        stepParameter: (name, value, mode) => this.#attachStepMetadataSync({ parameters: [{ name, value, mode }] }),
      };
    }

    return this.cachedPlaywrightSyncRuntime;
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

  async attachment(name: string, content: Uint8Array | Buffer | string, options: AttachmentOptions) {
    await test.info().attach(name, {
      body: content instanceof Uint8Array ? Buffer.from(content) : content,
      contentType: options.contentType,
    });
  }

  async attachmentFromPath(name: string, path: string, options: AttachmentOptions) {
    await test.info().attach(name, { path, contentType: options.contentType });
  }

  override sendMessageSync(message: RuntimeMessage) {
    this.#attachRuntimeMessage(message);
  }

  async sendMessage(message: RuntimeMessage) {
    await test.info().attach(`Allure Metadata (${message.type})`, {
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(message), "utf8"),
    });
  }

  #attachRuntimeMessage(message: RuntimeMessage) {
    this.#getInternalTestInfo()._attach({
      name: `Allure Metadata (${message.type})`,
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(message), "utf8"),
    });
  }

  #attachStepMetadataSync(data: {
    name?: string;
    parameters?: { name: string; value: string; mode?: ParameterMode }[];
  }) {
    this.#attachSyntheticAttachStep("Allure Step Metadata", {
      name: "Allure Step Metadata",
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(
        JSON.stringify({
          type: "step_metadata",
          data,
        } satisfies RuntimeMessage),
        "utf8",
      ),
    });
  }

  #attachContentSync(name: string, content: Uint8Array | Buffer | string, options: AttachmentOptions) {
    this.#attachSyntheticAttachStep(name, {
      name,
      contentType: options.contentType,
      body: toAttachmentBody(content, options.encoding),
    });
  }

  #attachPathSync(name: string, path: string, options: Omit<AttachmentOptions, "encoding">) {
    this.#attachSyntheticAttachStep(name, {
      name,
      contentType: options.contentType,
      path,
    });
  }

  #attachSyntheticAttachStep(name: string, attachment: PlaywrightInternalAttachment) {
    const info = this.#getInternalTestInfo();
    const attachStep = info._addStep({
      category: "test.attach",
      title: `Attach "${name}"`,
    });

    try {
      info._attach(attachment, attachStep.stepId);
      attachStep.complete({});
    } catch (error) {
      attachStep.complete({ error });
      throw error;
    }
  }

  #logStepSync(name: string, status: Status, error?: Error) {
    const step = this.#startSyncStep(name);
    const stepError = error ? this.#toPlaywrightStepError(error) : undefined;

    if (status !== Status.PASSED) {
      step.info.annotations.push({
        type: ALLURE_STEP_STATUS_ANNOTATION,
        description: status,
      });
    }

    step.complete(stepError ? { error: stepError } : {});
  }

  #stepSync<T>(name: string, body: () => T): T {
    const step = this.#startSyncStep(name);

    try {
      const result = this.#runInStepZone(step, body);

      if (isPromise(result)) {
        const error = this.createSyncPromiseError();
        step.info.annotations.push({
          type: ALLURE_STEP_STATUS_ANNOTATION,
          description: Status.BROKEN,
        });
        step.complete({ error });
        throw error;
      }

      step.complete({});
      return result;
    } catch (error) {
      const runtimeError = error as Error;
      const status = getStatusFromError(runtimeError);

      if (status !== Status.FAILED) {
        step.info.annotations.push({
          type: ALLURE_STEP_STATUS_ANNOTATION,
          description: status,
        });
      }

      step.complete({ error });
      throw error;
    }
  }

  #startSyncStep(name: string): PlaywrightInternalStep {
    return this.#getInternalTestInfo()._addStep({
      category: "test.step",
      title: name,
      infectParentStepsWithError: true,
    });
  }

  #runInStepZone<T>(step: PlaywrightInternalStep, body: () => T): T {
    return getPlaywrightInternals().currentZone().with("stepZone", step).run(body);
  }

  #toPlaywrightStepError(error: Error): Error {
    if (error.name !== "Error") {
      return error;
    }

    const playwrightError = new Error(error.message, { cause: error.cause });
    playwrightError.name = "";
    playwrightError.stack = error.stack;
    return playwrightError;
  }

  #getInternalTestInfo(): PlaywrightInternalTestInfo {
    return test.info() as PlaywrightInternalTestInfo;
  }
}
