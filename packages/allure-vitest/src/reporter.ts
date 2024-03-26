import { hostname } from "node:os";
import { basename, normalize, relative } from "node:path";
import { cwd, env } from "node:process";
import { File, Reporter, Task } from "vitest";
import {
  MessageAllureWriter,
  extractMetadataFromString,
  getSuitesLabels,
} from "allure-js-commons";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";
import { Stage, Status, LabelName, TestResult } from "allure-js-commons/new";
import { Config } from "allure-js-commons/new/sdk";
import { AllureNodeReporterRuntime } from "allure-js-commons/new/sdk/node";
import { getSuitePath, getTestFullName } from "./utils.js";

export interface AllureVitestReporterConfig extends Config {
  testMode?: boolean;
}

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME } = env;

export default class AllureVitestReporter implements Reporter {
  private allureReporterRuntime: AllureNodeReporterRuntime;
  private config: AllureVitestReporterConfig;
  private hostname: string = ALLURE_HOST_NAME || hostname();

  constructor(config: AllureVitestReporterConfig) {
    this.config = config;
  }

  onInit() {
    const { listeners, testMode, ...config } = this.config;

    this.allureReporterRuntime = new AllureNodeReporterRuntime({
      ...config,
      writer: testMode ? new MessageAllureWriter() : undefined,
      listeners,
    });
  }

  onFinished(files?: File[]) {
    for (const file of files || []) {
      for (const task of file.tasks) {
        this.handleTask(task);
      }
    }
  }

  async handleTask(task: Task) {
    // do not report skipped tests
    if (task.mode === "skip" && !task.result) {
      return;
    }

    if (task.type === "suite") {
      for (const innerTask of task.tasks) {
        this.handleTask(innerTask);
      }
      return;
    }

    const { allureTestResult, VITEST_POOL_ID } = task.meta as {
      allureTestResult: TestResult;
      VITEST_POOL_ID: string;
    };
    const suitePath = getSuitePath(task);
    const normalizedTestPath = normalize(relative(cwd(), task.file.filepath))
      .replace(/^\//, "")
      .split("/")
      .filter((item: string) => item !== basename(task.file.filepath));
    const titleMetadata = extractMetadataFromString(task.name);
    const testDisplayName = allureTestResult.name || titleMetadata.cleanTitle;
    const testFullname = getTestFullName(task, cwd());

    const testUUID = await this.allureReporterRuntime.start(
      {
        ...allureTestResult,
        name: testDisplayName,
      },
      task.result.startTime,
    );
    await this.allureReporterRuntime.update(testUUID, (result) => {
      const threadId = ALLURE_THREAD_NAME || (VITEST_POOL_ID && `${this.hostname}-vitest-worker-${VITEST_POOL_ID}`);

      result.fullName = testFullname;

      result.labels.push({
        name: LabelName.FRAMEWORK,
        value: "vitest",
      });
      result.labels.push({
        name: LabelName.LANGUAGE,
        value: "javascript",
      });
      result.labels.push({
        name: LabelName.HOST,
        value: this.hostname,
      });

      titleMetadata.labels.forEach((label) => {
        result.labels.push(label);
      });
      getSuitesLabels(suitePath).forEach((label) => {
        result.labels.push(label);
      });

      if (threadId) {
        result.labels.push({
          name: LabelName.THREAD,
          value: threadId,
        });
      }

      if (normalizedTestPath.length) {
        result.labels.push({
          name: LabelName.PACKAGE,
          value: normalizedTestPath.join("."),
        });
      }

      switch (task.result?.state) {
        case "fail": {
          result.statusDetails = {
            message: task.result.errors?.[0]?.message || "",
            trace: task.result.errors?.[0]?.stack || "",
          };
          result.status = Status.FAILED;
          result.stage = Stage.FINISHED;
          break;
        }
        case "pass": {
          result.status = Status.PASSED;
          result.stage = Stage.FINISHED;
          break;
        }
        case "skip": {
          result.status = Status.SKIPPED;
          result.stage = Stage.PENDING;
          break;
        }
      }
    });
    await this.allureReporterRuntime.stop(testUUID, task.result.startTime + task.result?.duration || 0);
    await this.allureReporterRuntime.write(testUUID);

    // const skippedByTestPlan = currentTest.labels?.some(({ name }) => name === ALLURE_SKIPPED_BY_TEST_PLAN_LABEL);
    //
    // // do not report tests skipped by test plan
    // if (skippedByTestPlan) {
    //   return;
    // }
    //
    // TODO: format links before the result writing
    // const links = currentTest.links ? this.processMetadataLinks(currentTest.links) : [];
    //
    // test.calculateHistoryId();
    // test.endTest(task.result.startTime + task.result?.duration || 0);
  }
}
