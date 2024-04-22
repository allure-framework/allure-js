import {
  AttachmentOptions,
  Category,
  Link,
  Messages,
  RawAttachment,
  RuntimeMessage,
  RuntimeMetadataMessage,
  RuntimeRawAttachmentMessage,
  RuntimeStartStepMessage,
  RuntimeStepMetadataMessage,
  RuntimeStopStepMessage,
  StepResult,
  TestResult,
} from "../model.js";
import { deepClone, typeToExtension } from "../utils.js";
import { Config, LinkConfig } from "./Config.js";
import { Crypto } from "./Crypto.js";
import { Notifier } from "./LifecycleListener.js";
import { LifecycleState } from "./LifecycleState.js";
import { Writer } from "./Writer.js";
import { createStepResult, createTestResult, getTestResultHistoryId } from "./utils.js";

export class ReporterRuntime {
  private notifier: Notifier;
  private links: LinkConfig[] = [];
  state = new LifecycleState();
  writer: Writer;
  crypto: Crypto;

  constructor({ writer, listeners = [], crypto, links = [] }: Config & { crypto: Crypto }) {
    this.writer = writer;
    this.notifier = new Notifier({ listeners });
    this.crypto = crypto;
    this.links = links;
  }

  start = (result: Partial<TestResult>, start?: number) => {
    const uuid = this.crypto.uuid();
    const stateObject: TestResult = {
      ...createTestResult(uuid),
      ...deepClone(result),
      start: start || Date.now(),
    };

    this.notifier.beforeTestResultStart(stateObject);
    this.state.setTestResult(uuid, stateObject);
    this.notifier.afterTestResultStart(this.state.testResults.get(uuid)!);

    return uuid;
  };

  /**
   * Updates test result by uuid
   * @example
   * ```ts
   * runtime.update(uuid, (result) => {
   *   // change the result directly, you don't need to return anything
   *   result.name = "foo";
   * });
   * ```
   * @param uuid - test result uuid
   * @param updateFunc - function that updates test result; result passes as a single argument and should be mutated to apply changes
   */
  update = (uuid: string, updateFunc: (result: TestResult) => void) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to update!`);
      return;
    }

    this.notifier.beforeTestResultUpdate(targetResult);
    updateFunc(targetResult);
    this.notifier.afterTestResultUpdate(targetResult);
  };

  stop = (uuid: string, stop?: number) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to stop!`);
      return;
    }

    this.notifier.beforeTestResultStop(targetResult);

    targetResult.historyId = getTestResultHistoryId(this.crypto, targetResult);
    targetResult.stop = stop || Date.now();

    this.notifier.afterTestResultStop(targetResult);
  };

  startStep = (uuid: string, result: Partial<StepResult>, start?: number) => {
    if (!this.state.testResults.has(uuid)) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to start step!`);
      return;
    }

    this.state.setStepResult(uuid, {
      ...createStepResult(),
      start: start || Date.now(),
      ...result,
    });
  };

  updateStep = (uuid: string, updateFunc: (stepResult: StepResult) => void) => {
    if (!this.state.testResults.has(uuid)) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to update step!`);
      return;
    }

    const currentStep = this.state.getCurrentStep(uuid)!;

    if (!currentStep) {
      // eslint-disable-next-line no-console
      console.error(`No step ${uuid}`);
      return;
    }

    updateFunc(currentStep);
  };

  stopStep = (uuid: string, stop: number = Date.now()) => {
    if (!this.state.testResults.has(uuid)) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to stop step!`);
      return;
    }

    if (!this.state.getCurrentStep(uuid)) {
      // eslint-disable-next-line no-console
      console.error(`No step ${uuid}`);
      return;
    }

    const currentStep = this.state.popStep(uuid)!;
    const prevStep = this.state.getCurrentStep(uuid);

    if (prevStep) {
      this.updateStep(uuid, (step) => {
        step.steps.push({
          ...currentStep,
          stop,
        });
      });
      return;
    }

    this.update(uuid, (result) => {
      result.steps.push({
        ...currentStep,
        stop,
      });
    });
  };

  write = (uuid: string) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to write!`);
      return;
    }

    this.writer.writeResult(targetResult);
    this.state.deleteTestResult(uuid);
  };

  buildAttachmentFileName = (options: AttachmentOptions): string => {
    const attachmentUuid = this.crypto.uuid();
    const attachmentExtension = options.fileExtension || typeToExtension({ contentType: options.contentType });

    return `${attachmentUuid}-attachment${attachmentExtension}`;
  };

  writeAttachment = (uuid: string, attachment: RawAttachment) => {
    const attachmentFilename = this.buildAttachmentFileName(attachment);

    this.writer.writeAttachment(
      attachmentFilename,
      attachment.content,
      (attachment.encoding as BufferEncoding) || "base64",
    );

    const rawAttachment = {
      name: attachment.name,
      source: attachmentFilename,
      type: attachment.contentType,
    };

    if (this.state.getCurrentStep(uuid)) {
      this.updateStep(uuid, (step) => {
        step.attachments.push(rawAttachment);
      });
      return;
    }

    this.update(uuid, (result) => {
      result.attachments.push(rawAttachment);
    });
  };

  writeEnvironmentInfo = (environmentInfo: Record<string, string>) => {
    this.writer.writeEnvironmentInfo(environmentInfo);
  };

  writeCategoriesDefinitions = (categories: Category[]) => {
    const serializedCategories = categories.map((c) => {
      if (c.messageRegex instanceof RegExp) {
        c.messageRegex = c.messageRegex.source;
      }

      if (c.traceRegex instanceof RegExp) {
        c.traceRegex = c.traceRegex.source;
      }

      return c;
    });

    this.writer.writeCategoriesDefinitions(serializedCategories);
  };

  private formatLinks = (links: Link[]) => {
    if (!this.links.length) {
      return links;
    }

    return links.map((link) => {
      // TODO:
      // @ts-ignore
      const matcher = this.links?.find?.(({ type }) => type === link.type);

      // TODO:
      if (!matcher || link.url.startsWith("http")) {
        return link;
      }

      const url = matcher.urlTemplate.replace("%s", link.url);

      return {
        ...link,
        url,
      };
    });
  };

  applyRuntimeMessages = <T>(
    uuid: string,
    messages: Messages<T>[] = [],
    customMessageHandler?: (
      message: Exclude<Messages<T>, RuntimeMessage>,
      targetResult: TestResult,
      currentStep?: StepResult,
    ) => void | Promise<void>,
  ) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to apply runtime messages to!`);
      return;
    }

    for (const message of messages) {
      const type = message.type;

      if (type === "metadata") {
        const { links = [], attachments, displayName, ...rest } = (message as RuntimeMetadataMessage).data;
        const formattedLinks = this.formatLinks(links);

        if (this.state.getCurrentStep(uuid)) {
          this.state.updateTestResult(uuid, {
            name: displayName,
            links: formattedLinks,
            ...rest,
          });
          this.state.updateCurrentStep(uuid, {
            attachments,
          });
          continue;
        }

        this.state.updateTestResult(uuid, {
          name: displayName,
          links: formattedLinks,
          attachments,
          ...rest,
        });
        continue;
      }

      if (type === "step_start") {
        this.state.setStepResult(uuid, (message as RuntimeStartStepMessage).data);
        continue;
      }

      if (type === "step_metadata") {
        this.state.updateCurrentStep(uuid, (message as RuntimeStepMetadataMessage).data);
        continue;
      }

      if (type === "step_stop") {
        // TODO: move this add/remove steps logic to lifecycle state
        if (!this.state.getCurrentStep(uuid)) {
          // eslint-disable-next-line no-console
          console.error("No step to stop");
          continue;
        }

        this.state.updateCurrentStep(uuid, (message as RuntimeStopStepMessage).data);

        const currentStep = this.state.popStep(uuid)!;
        const prevStep = this.state.getCurrentStep(uuid);

        if (prevStep) {
          prevStep.steps.push(currentStep);
          continue;
        }

        targetResult.steps.push(currentStep);
        continue;
      }

      if (type === "raw_attachment") {
        this.writeAttachment(uuid, (message as RuntimeRawAttachmentMessage).data);
        continue;
      }

      if (!customMessageHandler) {
        continue;
      }

      customMessageHandler(
        message as Exclude<Messages<T>, RuntimeMessage>,
        targetResult,
        this.state.getCurrentStep(uuid),
      );
    }
  };
}
