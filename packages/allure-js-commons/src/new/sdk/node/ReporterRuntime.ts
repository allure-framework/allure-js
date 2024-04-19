import { AttachmentOptions } from "../../model.js";
import { Config } from "../Config.js";
import { ReporterRuntime } from "../ReporterRuntime.js";
import { AllureNodeCrypto } from "./Crypto.js";

export class AllureNodeReporterRuntime extends ReporterRuntime {
  constructor({ writer, listeners, links }: Config) {
    super({
      writer,
      listeners,
      crypto: new AllureNodeCrypto(),
      links,
    });
  }

  writeAttachmentFromPath = (
    uuid: string,
    attachmentName: string,
    attachmentPath: string,
    options: AttachmentOptions,
  ) => {
    const attachmentFilename = this.buildAttachmentFileName(options);

    this.writer.writeAttachmentFromPath(attachmentPath, attachmentFilename);

    const rawAttachment = {
      name: attachmentName,
      source: attachmentFilename,
      type: options.contentType,
    };

    if (this.state.getCurrentStep(uuid)) {
      this.updateStep(uuid, (step) => {
        step.attachments.push(rawAttachment);
      });
    } else {
      this.update(uuid, (result) => {
        result.attachments.push(rawAttachment);
      });
    }

    return attachmentFilename;
  };
}
