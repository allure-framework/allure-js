import type { HeaderList, RequestBody } from "postman-collection";

export interface PmItem {
  name: string;
  passed: boolean;
  failedAssertions: string[];
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
