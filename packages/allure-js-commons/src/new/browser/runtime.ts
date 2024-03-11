import { AllureConfig } from "../framework/AllureConfig";
import { AllureRuntime } from "../framework/AllureRuntime";
import md5 from "md5";

export class AllureBrowserRuntime extends AllureRuntime {
  constructor(config: AllureConfig) {
    super(config, {
      uuid: () => globalThis.crypto.randomUUID(),
      md5,
    });
  }

  writeAttachmentFromPath() {
    throw new Error(
      "Browser Allure runtime doesn't support writting attachments from path! User AllureNodeRuntime instead or alternative methods to write attachments.",
    );
  }
}
