import { PathLike, readFileSync } from "fs";
import { AllureInMemoryAllureWriter as CommonInMemoryWriter } from "../../framework/writers/AllureInMemoryWriter";

export class AllureInMemoryWriter extends CommonInMemoryWriter {
  public writeAttachmentFromPath(from: PathLike, toFileName: string): void {
    this.attachments[toFileName] = readFileSync(from);
  }
}
