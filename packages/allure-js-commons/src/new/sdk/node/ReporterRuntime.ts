import { AttachmentOptions, Executable, TestResult } from "../../model.js";
import { Config } from "../Config.js";
import { ReporterRuntime } from "../ReporterRuntime.js";
import { AllureNodeCrypto } from "./Crypto.js";
import { getGlobalLabels } from "./utils.js";

export class AllureNodeReporterRuntime extends ReporterRuntime {
  constructor({ writer, listeners, links, environmentInfo, categories }: Config) {
    super({
      writer,
      listeners,
      crypto: new AllureNodeCrypto(),
      links,
      environmentInfo,
      categories,
    });
  }

  writeAttachmentFromPath = (
    uuid: string,
    attachmentName: string,
    attachmentPath: string,
    options: AttachmentOptions,
  ) => {
    const target = this.getCurrentExecutableOf(uuid);
    if (!target) {
      // eslint-disable-next-line no-console
      console.error(`No fixture or test (${uuid}) to attach!`);
      return;
    }

    return this.attachFromPath(attachmentName, attachmentPath, options, target);
  };

  writeAttachmentToCurrentItemFromPath = (
    attachmentName: string,
    attachmentPath: string,
    options: AttachmentOptions,
  ) => {
    const target = this.getCurrentExecutable();
    if (!target) {
      // eslint-disable-next-line no-console
      console.error("No current fixture, test, or step to attach!");
      return;
    }
    return this.attachFromPath(attachmentName, attachmentPath, options, target);
  };

  protected override createTestResult(result: Partial<TestResult>, start?: number | undefined): TestResult {
    return super.createTestResult(
      {
        ...result,
        labels: (result.labels ?? []).concat(getGlobalLabels())
      },
      start
    );
  }

  private attachFromPath = (
    attachmentName: string,
    attachmentPath: string,
    options: AttachmentOptions,
    target: Executable,
  ) => {
    const attachmentFilename = this.buildAttachmentFileName(options);

    this.writer.writeAttachmentFromPath(attachmentPath, attachmentFilename);

    const rawAttachment = {
      name: attachmentName,
      source: attachmentFilename,
      type: options.contentType,
    };

    target.attachments.push(rawAttachment);

    return attachmentFilename;
  };
}
