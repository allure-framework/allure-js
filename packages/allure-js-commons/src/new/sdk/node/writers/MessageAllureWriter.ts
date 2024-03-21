import { PathLike, readFileSync } from "fs";
import properties from "properties";
import { AllureWriter } from "../../framework/AllureWriter.js";
import { Category, TestResult, TestResultContainer } from "../../model.js";

type EventType = "result" | "container" | "attachment" | "misc";
type Event = {
  path: string;
  type: EventType;
  data: string;
};

const sendEvent = (event: Event): void => {
  process.send?.(JSON.stringify(event));
};

const sendData = (path: string, type: EventType, data: Buffer): void => {
  sendEvent({ path, type, data: data.toString("base64") });
};

const writeJson = (path: string, type: EventType, data: any): void => {
  sendData(path, type, Buffer.from(JSON.stringify(data)));
};

export class MessageAllureWriter implements AllureWriter {
  writeAttachment(name: string, content: Buffer | string, encoding: BufferEncoding = "utf-8"): void {
    sendData(name, "attachment", typeof content === "string" ? Buffer.from(content, encoding) : content);
  }

  writeAttachmentFromPath(from: PathLike, distFileName: string): void {
    sendData(distFileName, "attachment", readFileSync(from));
  }

  writeEnvironmentInfo(info?: Record<string, string | undefined>): void {
    const text = properties.stringify(info, { unicode: true }).toString();
    sendData("environment.properties", "misc", Buffer.from(text));
  }

  writeCategoriesDefinitions(categories: Category[]): void {
    writeJson("categories.json", "misc", categories);
  }

  writeGroup(result: TestResultContainer): void {
    writeJson(`${result.uuid}-container.json`, "container", result);
  }

  writeResult(result: TestResult): void {
    writeJson(`${result.uuid}-result.json`, "result", result);
  }
}
