import { normalize, relative } from "node:path";
import { cwd, env } from "node:process";
import type { File, Reporter, Task } from "vitest";
import { LabelName, Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import {
  FileSystemWriter,
  MessageWriter,
  ReporterRuntime,
  getEnvironmentLabels,
  getHostLabel,
  getSuiteLabels,
  getThreadLabel,
} from "allure-js-commons/sdk/reporter";
import { getSuitePath, getTestFullName } from "./utils.js";

export default class AllureVitestReporter implements Reporter {
  private allureReporterRuntime?: ReporterRuntime;
  private config: ReporterConfig;

  constructor(config: ReporterConfig) {
    this.config = config;
  }

  onInit() {
    const { listeners, ...config } = this.config;
    const writer = env.ALLURE_TEST_MODE
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
    this.allureReporterRuntime!.writeEnvironmentInfo();
    this.allureReporterRuntime!.writeCategoriesDefinitions();
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

    const {
      allureRuntimeMessages = [],
      VITEST_POOL_ID,
      allureSkip = false,
    } = task.meta as {
      allureRuntimeMessages: RuntimeMessage[];
      VITEST_POOL_ID: string;
      allureSkip?: boolean;
    };

    // do not report tests skipped by test plan
    if (allureSkip) {
      return;
    }

    const suitePath = getSuitePath(task);
    const normalizedTestPath = normalize(relative(cwd(), task.file!.filepath)).replace(/^\//, "").split("/");
    const titleMetadata = extractMetadataFromString(task.name);
    const testDisplayName = titleMetadata.cleanTitle || task.name;
    const testFullname = getTestFullName(task, cwd());
    const testUuid = this.allureReporterRuntime!.startTest({
      name: testDisplayName,
      start: task.result?.startTime,
    });

    this.allureReporterRuntime!.updateTest(testUuid, (result) => {
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
      result.labels.push(...getSuiteLabels(suitePath));
      result.labels.push(...getEnvironmentLabels());
      result.labels.push(getHostLabel());
      result.labels.push(getThreadLabel(VITEST_POOL_ID && `vitest-worker-${VITEST_POOL_ID}`));

      if (normalizedTestPath.length) {
        result.labels.push({
          name: LabelName.PACKAGE,
          value: normalizedTestPath.join("."),
        });
      }

      this.allureReporterRuntime!.applyRuntimeMessages(testUuid, allureRuntimeMessages);

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
    });
    this.allureReporterRuntime!.stopTest(testUuid, { duration: task.result?.duration ?? 0 });
    this.allureReporterRuntime!.writeTest(testUuid);
  }
}
