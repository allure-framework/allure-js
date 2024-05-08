import { PathLike, readFileSync } from "fs";
import { EventEmitter } from "node:events";
import process from "process";
import properties from "properties";
import { Category, TestResult, TestResultContainer } from "../../../model.js";
import { Writer } from "../../Writer.js";

type EventType = "result" | "container" | "attachment" | "misc";
type Event = {
  path: string;
  type: EventType;
  data: string;
};

export class MessageAllureWriter implements Writer {
  constructor(private bus?: EventEmitter) {}

  private sendData(path: string, type: EventType, data: Buffer) {
    const event = { path, type, data: data.toString("base64") };

    if (this.bus) {
      this.bus.emit("allureWriterMessage", JSON.stringify(event));
      return;
    }

    process.send?.(JSON.stringify(event));
  }

  private writeJson(path: string, type: EventType, data: any) {
    this.sendData(path, type, Buffer.from(JSON.stringify(data)));
  }

  writeAttachment(name: string, content: Buffer | string, encoding: BufferEncoding = "utf-8"): void {
    this.sendData(name, "attachment", typeof content === "string" ? Buffer.from(content, encoding) : content);
  }

  writeAttachmentFromPath(from: PathLike, distFileName: string): void {
    this.sendData(distFileName, "attachment", readFileSync(from));
  }

  writeEnvironmentInfo(info?: Record<string, string | undefined>): void {
    const text = properties.stringify(info, { unicode: true }).toString();

    this.sendData("environment.properties", "misc", Buffer.from(text));
  }

  writeCategoriesDefinitions(categories: Category[]): void {
    this.writeJson("categories.json", "misc", categories);
  }

  writeGroup(result: TestResultContainer): void {
    this.writeJson(`${result.uuid}-container.json`, "container", result);
  }

  writeResult(result: TestResult): void {
    this.writeJson(`${result.uuid}-result.json`, "result", result);
  }
}
