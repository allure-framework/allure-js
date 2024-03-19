import md5 from "md5";
import { AllureConfig } from "../framework/AllureConfig";
import { AllureBaseRuntime, AllureRuntime } from "../framework/AllureRuntime";

export class AllureBrowserRuntime extends AllureBaseRuntime implements AllureRuntime {
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
