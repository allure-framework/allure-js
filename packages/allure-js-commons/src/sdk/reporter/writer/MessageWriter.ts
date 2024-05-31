import type { PathLike } from "fs";
import { readFileSync } from "fs";
import type { EventEmitter } from "node:events";
import process from "process";
import type { TestResult, TestResultContainer } from "../../../model.js";
import type { AllureResults, Category, EnvironmentInfo } from "../../types.js";
import type { Writer } from "../types.js";
import { parseProperties, stringifyProperties } from "../utils.js";

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
    this.sendData(path, type, Buffer.from(JSON.stringify(data)));
  }

  writeAttachment(distFileName: string, content: Buffer | string, encoding: BufferEncoding = "utf-8"): void {
    this.sendData(distFileName, "attachment", typeof content === "string" ? Buffer.from(content, encoding) : content);
  }

  writeAttachmentFromPath(from: PathLike, distFileName: string): void {
    this.sendData(distFileName, "attachment", readFileSync(from));
  }

  writeEnvironmentInfo(info: EnvironmentInfo): void {
    const text = stringifyProperties(info, { unicode: true }).toString();

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

const parseJsonResult = <T>(data: string) => {
  return JSON.parse(Buffer.from(data, "base64").toString("utf8")) as T;
};

export class MessageReader {
  readonly results: AllureResults = {
    tests: [],
    groups: [],
    attachments: {},
  };

  handleMessage = (jsonMessage: string) => {
    const { path, type = "undefined", data }: { path: string; type?: string; data: string } = JSON.parse(jsonMessage);

    switch (type) {
      case "container":
        this.results.groups.push(parseJsonResult<TestResultContainer>(data));
        return;
      case "result":
        this.results.tests.push(parseJsonResult<TestResult>(data));
        return;
      case "attachment":
        this.results.attachments[path] = data;
        return;
      case "misc":
        switch (path) {
          case "environment.properties":
            this.results.envInfo = parseProperties(Buffer.from(data, "base64").toString()) as EnvironmentInfo;
            break;
          case "categories.json":
            this.results.categories = parseJsonResult(data);
            break;
          default:
            break;
        }
        return;
      default:
        return;
    }
  };
}
