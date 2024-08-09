import { attachment, step } from "../../../facade.js";
import type { TestResult, TestResultContainer } from "../../../model.js";
import type { AllureResults, EnvironmentInfo } from "../../types.js";
import { parseProperties, stringifyProperties } from "../utils.js";

const parseJsonResult = <T>(data: string) => {
  return JSON.parse(Buffer.from(data, "base64").toString("utf-8")) as T;
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
        this.handleCustomMessage(type, data, path);
        return;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleCustomMessage = (type: string, data: any, path: string) => {};

  attachResults = async () => {
    await step("allure-results", async () => {
      if (this.results.categories) {
        await attachment("categories.json", JSON.stringify(this.results.categories), "application/json");
      }
      if (this.results.envInfo) {
        await attachment("environment.properties", stringifyProperties(this.results.envInfo), "text/plain");
      }
      if (this.results.attachments) {
        for (const key of Object.keys(this.results.attachments)) {
          const content = this.results.attachments[key];
          await attachment(key, content, {
            contentType: "text/plain",
            encoding: "base64",
          });
        }
      }
      if (this.results.tests) {
        for (const tr of this.results.tests) {
          await attachment(`${tr.uuid}-result.json`, JSON.stringify(tr, null, 2), {
            contentType: "application/json",
            encoding: "utf-8",
          });
        }
      }
      if (this.results.groups) {
        for (const trc of this.results.groups) {
          await attachment(`${trc.uuid}-container.json`, JSON.stringify(trc, null, 2), {
            contentType: "application/json",
            encoding: "utf-8",
          });
        }
      }
    });
  };
}
