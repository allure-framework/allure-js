import { extname } from "path";
import { AttachmentOptions, TestResult } from "../../model.js";
import { Config } from "../Config.js";
import { ReporterRuntime } from "../ReporterRuntime.js";
import { WellKnownWriters } from "../utils.js";
import { AllureNodeCrypto } from "./Crypto.js";
import { getGlobalLabels } from "./utils.js";
import * as wellKnownNodeWriters from "./writers/index.js";

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
    attachmentName: string,
    attachmentPath: string,
    options: AttachmentOptions,
    uuid?: string,
  ) => {
    const target = this.getCurrentExecutingItem(uuid);
    if (!target) {
      if (uuid) {
        // eslint-disable-next-line no-console
        console.error(`No test or fixture ${uuid} to attach!`);
      } else {
        // eslint-disable-next-line no-console
        console.error("No current test or fixture to attach!");
      }
      return;
    }

    const attachmentFilename = this.buildAttachmentFileName({
      ...options,
      fileExtension: options.fileExtension ?? extname(attachmentPath),
    });

    this.writer.writeAttachmentFromPath(attachmentPath, attachmentFilename);

    const rawAttachment = {
      name: attachmentName,
      source: attachmentFilename,
      type: options.contentType,
    };

    target.attachments.push(rawAttachment);

    return attachmentFilename;
  };

  protected override createTestResult(result: Partial<TestResult>): TestResult {
    return super.createTestResult({
      ...result,
      labels: (result.labels ?? []).concat(getGlobalLabels()),
    });
  }

  protected getWellKnownWriters(): WellKnownWriters {
    return Object.assign({}, super.getWellKnownWriters(), wellKnownNodeWriters);
  }
}
