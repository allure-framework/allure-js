import {
  Allure2,
  InMemoryAllureWriter,
  Status,
  TestResult,
  TestResultContainer
} from "allure-js-commons";

import { Worker } from "worker_threads";
import { IAllureWriter } from "allure-js-commons";

type AllureResultType = "TestResult" | "Container"
interface AllureResultEvent {
  name: AllureResultType
  data: TestResult | TestResultContainer
}

export class ResultsDispatcher {
  writer: IAllureWriter;

  constructor(writer: IAllureWriter) {
    this.writer = writer;
  }

  public onMessage(message: AllureResultEvent) {
    switch (message.name) {
      case "TestResult":
        this.writer.writeResult(message.data as TestResult);
        break;
      case "Container":
        this.writer.writeGroup(message.data as TestResultContainer);
        break;
    }
  }
}

export const runTest = (specDefinitions: (testAllure: Allure2) => void): Promise<InMemoryAllureWriter> => (
  new Promise((resolve, reject) => {
    const writer = new InMemoryAllureWriter();
    const dispatcher = new ResultsDispatcher(writer);
    const worker = new Worker("./dist/test/worker.js",
      { workerData: specDefinitions.toString(), /*stdout: true, stderr: true*/ });
    worker.on("message", message => dispatcher.onMessage(message));
    worker.on("exit", () => {
      resolve(writer);
    });
  })
);

/*
todo:
failing test +

throwing test

skipped test ++

test nested in 3 describes

async passing test
async failing test

attach text
attach inside step

step +
nested step ++
failing step ~
 */
