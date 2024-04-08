import { AttachmentOptions, ContentType } from "../../model.js";
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

  writeAttachmentFromPath = (attachmentPath: string, options: AttachmentOptions): string => {
    const attachmentFilename = this.buildAttachmentFileName(options);

    this.writer.writeAttachmentFromPath(attachmentPath, attachmentFilename);

    return attachmentFilename;
  };
}
