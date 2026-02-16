import { readFileSync } from "fs";
import type { EventEmitter } from "node:events";
import process from "process";
import type { GlobalInfo, TestResult, TestResultContainer } from "../../../model.js";
import type { Category, EnvironmentInfo } from "../../types.js";
import type { Writer } from "../types.js";
import { stringifyEnvInfo } from "../utils/envInfo.js";

type EventType = "result" | "container" | "attachment" | "misc";

export class MessageWriter implements Writer {
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
    this.sendData(path, type, Buffer.from(JSON.stringify(data), "utf-8"));
  }

  writeAttachment(distFileName: string, content: Buffer): void {
    this.sendData(distFileName, "attachment", content);
  }

  writeAttachmentFromPath(distFileName: string, from: string): void {
    this.sendData(distFileName, "attachment", readFileSync(from));
  }

  writeEnvironmentInfo(info: EnvironmentInfo): void {
    const text = stringifyEnvInfo(info);

    this.sendData("environment.properties", "misc", Buffer.from(text, "utf-8"));
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

  writeGlobalInfo(distFileName: string, info: GlobalInfo): void {
    this.writeJson(distFileName, "misc", info);
  }
}
