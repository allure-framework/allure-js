import { createHash, randomUUID } from "crypto";
import { AllureConfig } from "../framework/AllureConfig";
import { AllureRuntime } from "../framework/AllureRuntime";
import { AttachmentOptions, ContentType } from "../model";

export class AllureNodeRuntime extends AllureRuntime {
  constructor(config: AllureConfig & { resultsDir: string }) {
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
