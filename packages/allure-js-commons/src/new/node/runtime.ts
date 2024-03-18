import { createHash, randomUUID } from "crypto";
import { AllureConfig } from "../framework/AllureConfig.js";
import { AllureBaseRuntime, AllureRuntime } from "../framework/AllureRuntime.js";
import { AttachmentOptions, ContentType } from "../model.js";

export class AllureNodeRuntime extends AllureBaseRuntime implements AllureRuntime {
  constructor(config: AllureConfig) {
    super(config, {
      uuid: () => {
        return randomUUID();
      },
      md5: (data: string) => {
        return createHash("md5").update(data).digest("hex");
      },
    });
  }

  writeAttachmentFromPath(fromPath: string, options: ContentType | string | AttachmentOptions): string {
    const fileName = this.buildAttachmentFileName(options);

    this.writer.writeAttachmentFromPath(fromPath, fileName);

    return fileName;
  }
}
