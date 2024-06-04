import type { AllureResults, EnvironmentInfo } from "../../types.js";
import type { TestResult, TestResultContainer } from "../../../model.js";
import { parseProperties } from "../utils.js";

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
        return;
    }
  };
}
