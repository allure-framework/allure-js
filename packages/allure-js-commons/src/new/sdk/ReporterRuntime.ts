import { Link, RawAttachment, StepResult, TestResult } from "../model.js";
import { deepClone, typeToExtension } from "../utils.js";
import { Config, LinkConfig } from "./Config.js";
import { Crypto } from "./Crypto.js";
import { Notifier } from "./LifecycleListener.js";
import { LifecycleState } from "./LifecycleState.js";
import { Writer } from "./Writer.js";
import { RuntimeMessage, RuntimeMetadataMessage, RuntimeRawAttachmentMessage } from "./model.js";
import { createTestResult, setTestResultHistoryId } from "./utils.js";

export class ReporterRuntime {
  private writer: Writer;
  private notifier: Notifier;
  private crypto: Crypto;
  private links: LinkConfig[] = [];
  private state = new LifecycleState();

  constructor({ writer, listeners = [], crypto, links = [] }: Config & { crypto: Crypto }) {
    this.writer = writer;
    this.notifier = new Notifier({ listeners });
    this.crypto = crypto;
    this.links = links;
  }

  start = async (result: Partial<TestResult>, start?: number) => {
    const uuid = this.crypto.uuid();
    const stateObject: TestResult = {
      ...createTestResult(uuid),
      ...deepClone(result),
      start: start || Date.now(),
    };

    await this.notifier.beforeTestResultStart(stateObject);

    this.state.setTestResult(uuid, stateObject);

    const testResult = this.state.testResults.get(uuid)!;

    await this.notifier.afterTestResultStart(testResult);

    return uuid;
  };

  update = async (uuid: string, updateFunc: (result: Partial<TestResult>) => void | Promise<void>) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error("There is no test result to update!");
      return;
    }

    // TODO: validate that the result link is the same for all the notifier hooks
    await this.notifier.beforeTestResultUpdate(targetResult);
    await updateFunc(targetResult);
    await this.notifier.afterTestResultUpdate(targetResult);
  };

  stop = async (uuid: string, stop?: number) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test ${uuid}`);
      return;
    }

    await this.notifier.beforeTestResultStop(targetResult);

    setTestResultHistoryId(this.crypto, targetResult);
    targetResult.stop = stop || Date.now();

    await this.notifier.afterTestResultStop(targetResult);
  };

  write = (uuid: string) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test ${uuid}`);
      return;
    }

    this.writer.writeResult(targetResult);
  };

  writeAttachment = (uuid: string, attachment: RawAttachment) => {
    const attachmentUuid = this.crypto.uuid();
    const attachmentExtension = typeToExtension({ contentType: attachment.contentType });
    const attachmentFilename = `${attachmentUuid}-attachment${attachmentExtension}`;

    this.writer.writeAttachment(
      attachmentFilename,
      attachment.content,
      (attachment.encoding as BufferEncoding) || "base64",
    );

    const currentResult = this.state.testResults.get(uuid)!;
    const currentStep = this.state.getLastStep(uuid);

    (currentStep || currentResult).attachments.push({
      name: attachment.name,
      source: attachmentFilename,
      type: attachment.contentType,
    });
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

  applyRuntimeMessages = async (
    uuid: string,
    messages: RuntimeMessage[] = [],
    customMessageHandler?: (
      message: unknown,
      targetResult: TestResult,
      currentStep?: StepResult,
    ) => void | Promise<void>,
  ) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test ${uuid}`);
      return;
    }

    for (const message of messages) {
      const { type, data } = message;

      if (type === "metadata") {
        const { links = [], parameters, attachments, displayName, ...rest } = data;
        const formattedLinks = this.formatLinks(links);

        if (this.state.getLastStep(uuid)) {
          this.state.updateTestResult(uuid, {
            name: displayName,
            links: formattedLinks,
            ...rest,
          });
          this.state.updateCurrentStep(uuid, {
            attachments,
            parameters,
          });
          continue;
        }

        this.state.updateTestResult(uuid, {
          name: displayName,
          links: formattedLinks,
          attachments,
          parameters,
          ...rest,
        });
        continue;
      }

      if (type === "step_start") {
        this.state.setStepResult(uuid, data);
        continue;
      }

      if (type === "step_stop") {
        // TODO: move this add/remove steps logic to lifecycle state
        if (!this.state.getLastStep(uuid)) {
          // eslint-disable-next-line no-console
          console.error("No step to stop");
          continue;
        }

        // TODO: rename to updateLastStep or rename getLastStep to getCurrentStep
        this.state.updateCurrentStep(uuid, data);

        const currentStep = this.state.popStep(uuid)!;
        const prevStep = this.state.getLastStep(uuid);

        if (prevStep) {
          prevStep.steps.push(currentStep);
          continue;
        }

        targetResult.steps.push(currentStep);
        continue;
      }

      if (type === "raw_attachment") {
        this.writeAttachment(uuid, data);
        continue;
      }

      if (!customMessageHandler) {
        continue;
      }

      await customMessageHandler(message, targetResult, this.state.getLastStep(uuid));
    }
  };
}
