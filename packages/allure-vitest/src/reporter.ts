import type { RunnerTestFile as File, RunnerTask as Task } from "vitest";
import type { Reporter } from "vitest/reporters";
import { LabelName, Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import {
  ReporterRuntime,
  createDefaultWriter,
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getSuiteLabels,
  getThreadLabel,
} from "allure-js-commons/sdk/reporter";
import { getTestMetadata } from "./utils.js";

export default class AllureVitestReporter implements Reporter {
  private allureReporterRuntime?: ReporterRuntime;
  private config: ReporterConfig;

  constructor(config: ReporterConfig) {
    this.config = config;
  }

  onInit() {
    const { listeners, resultsDir, ...config } = this.config;
    this.allureReporterRuntime = new ReporterRuntime({
      ...config,
      writer: createDefaultWriter({ resultsDir }),
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

    const { specPath, fullName, name, suitePath, labels: metadataLabels } = getTestMetadata(task);
    const testUuid = this.allureReporterRuntime!.startTest({
      name,
      start: task.result?.startTime,
    });

    this.allureReporterRuntime!.updateTest(testUuid, (result) => {
      result.fullName = fullName;
      result.labels.push(getFrameworkLabel("vitest"));
      result.labels.push(getLanguageLabel());
      result.labels.push(...metadataLabels);
      result.labels.push(...getSuiteLabels(suitePath));
      result.labels.push(...getEnvironmentLabels());
      result.labels.push(getHostLabel());
      result.labels.push(getThreadLabel(VITEST_POOL_ID && `vitest-worker-${VITEST_POOL_ID}`));

      if (specPath) {
        result.labels.push({
          name: LabelName.PACKAGE,
          value: specPath.replaceAll("/", "."),
        });
      }

      this.allureReporterRuntime!.applyRuntimeMessages(testUuid, allureRuntimeMessages);

      switch (task.result?.state) {
        case "fail": {
          const [error] = task.result.errors || [];
          const status = getStatusFromError(error);

          result.statusDetails = {
            ...getMessageAndTraceFromError(error),
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
