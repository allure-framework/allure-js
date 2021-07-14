import Jasmine from "jasmine";
import { JasmineAllureReporter2 } from "../src/JasmineAllureReporter2";
import { Category, TestResult, TestResultContainer } from "allure-js-commons";
import { IAllureWriter } from "allure-js-commons";
import { parentPort, workerData } from "worker_threads";

export class ResultsEmitter implements IAllureWriter {
  writeResult(result: TestResult) {
    parentPort?.postMessage({ name: "TestResult", data: result });
  }

  writeGroup(result: TestResultContainer) {
    parentPort?.postMessage({ name: "Container", data: result });
  }

  writeAttachment(name: string, content: Buffer | string) {}

  writeEnvironmentInfo(info: Record<string, string | undefined>) {}

  writeCategoriesDefinitions(categories: Category[]) {}
}

async function run() {
  return new Promise((resolve, reject) => {
    const writer = new ResultsEmitter();
    const testJasmine = new Jasmine({});
    const reporter = new JasmineAllureReporter2(
      {
        writer,
        resultsDir: ""
      });
    testJasmine.addReporter(reporter);
    testJasmine.onComplete(() => {
      resolve(writer);
    });
    const allure = reporter.getInterface();
    eval(workerData)(allure);
    testJasmine.execute();
  });
}

(async() => (run()))();
