import { basename, normalize, relative } from "node:path";
import { cwd } from "node:process";
import type { File, Reporter, Task } from "vitest";
import { LabelName, Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/sdk/reporter";
import type { Config } from "allure-js-commons/sdk/reporter";
import {
  FileSystemWriter,
  MessageWriter,
  ReporterRuntime,
  getEnvironmentLabels,
  getHostLabel,
  getSuitesLabels,
  getThreadLabel,
} from "allure-js-commons/sdk/reporter";
import { getSuitePath, getTestFullName } from "./utils.js";

export interface AllureVitestReporterConfig extends Omit<Config, "writer"> {
  testMode?: boolean;
}

export default class AllureVitestReporter implements Reporter {
  private allureReporterRuntime?: ReporterRuntime;
  private config: AllureVitestReporterConfig;

  constructor(config: AllureVitestReporterConfig) {
    this.config = config;
  }

  onInit() {
    const { listeners, testMode, ...config } = this.config;
    const writer = testMode
      ? new MessageWriter()
      : new FileSystemWriter({
          resultsDir: config.resultsDir || "./allure-results",
        });

    this.allureReporterRuntime = new ReporterRuntime({
      ...config,
      writer,
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
        await this.handleTask(innerTask);
      }
      return;
    }

    const { allureRuntimeMessages = [], VITEST_POOL_ID } = task.meta as {
      allureRuntimeMessages: RuntimeMessage[];
      VITEST_POOL_ID: string;
    };
    // TODO: maybe make part of core utils?
    const skippedByTestPlan = allureRuntimeMessages.some((message) => {
      if (message.type === "metadata") {
        return (message.data?.labels || []).some(({ name }) => name === ALLURE_SKIPPED_BY_TEST_PLAN_LABEL);
      }

      return false;
    });

    // do not report tests skipped by test plan
    if (skippedByTestPlan) {
      return;
    }

    const suitePath = getSuitePath(task);
    const normalizedTestPath = normalize(relative(cwd(), task.file!.filepath))
      .replace(/^\//, "")
      .split("/")
      .filter((item: string) => item !== basename(task.file!.filepath));
    const titleMetadata = extractMetadataFromString(task.name);
    const testDisplayName = titleMetadata.cleanTitle || task.name;
    const testFullname = getTestFullName(task, cwd());
    const testUuid = this.allureReporterRuntime!.startTest({
      name: testDisplayName,
      start: task.result!.startTime,
    });

    this.allureReporterRuntime!.updateTest((result) => {
      result.fullName = testFullname;
      result.labels.push({
        name: LabelName.FRAMEWORK,
        value: "vitest",
      });
      result.labels.push({
        name: LabelName.LANGUAGE,
        value: "javascript",
      });
      result.labels.push(...titleMetadata.labels);
      result.labels.push(...getSuitesLabels(suitePath));
      result.labels.push(...getEnvironmentLabels());
      result.labels.push(getHostLabel());
      result.labels.push(getThreadLabel(VITEST_POOL_ID && `vitest-worker-${VITEST_POOL_ID}`));

      if (normalizedTestPath.length) {
        result.labels.push({
          name: LabelName.PACKAGE,
          value: normalizedTestPath.join("."),
        });
      }

      this.allureReporterRuntime!.applyRuntimeMessages(allureRuntimeMessages, { testUuid });

      switch (task.result?.state) {
        case "fail": {
          const [error] = task.result.errors || [];
          const status = error?.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

          result.statusDetails = {
            message: error?.message || "",
            trace: error?.stack || "",
          };
          result.status = status;
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
    }, testUuid);
    this.allureReporterRuntime!.stopTest({
      uuid: testUuid,
      stop: (task.result?.startTime || 0) + (task.result?.duration || 0),
    });
    this.allureReporterRuntime!.writeTest(testUuid);
  }
}
