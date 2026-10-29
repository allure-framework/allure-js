import type { Status } from "allure-js-commons";
import type { Event, HeaderList, RequestBody, Script } from "postman-collection";

export interface ScriptExecution {
  event: Event;
  script?: Script;
  error?: { name: string; message: string; stack?: string };
}

export interface PmItem {
  name: string;
  passed: boolean;
  failedAssertions: string[];
  scriptErrors: { status: Status; message: string }[];
  requestError?: string;
  consoleLogs: string[];
  requestData?: PmRequestData;
  responseData?: PmResponseData;
  prerequest?: string;
  testScript?: string;
}

export interface PmRequestData {
  url: string;
  method: string;
  body?: RequestBody;
  headers?: HeaderList;
}

export interface PmResponseData {
  status: string;
  code: number;
  body: string;
  headers?: HeaderList;
}

export interface RunningItem {
  name: string;
  // allureTest: AllureTest;
  pmItem: PmItem;
  // steps: AllureStep[];
}
