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
import type { BunTestTask } from "./model.js";
import { extractMetadata, getTestFullName } from "./utils.js";

export class AllureBunReporter {
  private runtime: ReporterRuntime;
  private config: ReporterConfig;

  constructor(config: ReporterConfig = {}) {
    this.config = config;
    const { listeners, resultsDir, ...runtimeConfig } = config;

    this.runtime = new ReporterRuntime({
      ...runtimeConfig,
      writer: createDefaultWriter({ resultsDir }),
      listeners,
    });
  }

  onInit(): void {
    this.runtime.writeCategoriesDefinitions();
    this.runtime.writeEnvironmentInfo();
  }

  handleTest(task: BunTestTask): void {
    if (!task.state) {
      return;
    }

    const { name, suitePath, labels, links } = extractMetadata(task);
    const fullName = getTestFullName(task);
    const workerId = process.env.BUN_WORKER_ID || "0";

    const testUuid = this.runtime.startTest({
      name,
      fullName,
      start: Date.now(),
    });

    const messages: RuntimeMessage[] = task.meta?.allureRuntimeMessages || [];
    this.runtime.applyRuntimeMessages(testUuid, messages);

    this.runtime.updateTest(testUuid, (result) => {
      const fsPath = task.file.split("/");
      const titlePath = [...fsPath, ...suitePath, name];

      result.fullName = fullName;
      result.titlePath = titlePath;

      result.labels.push(
        getFrameworkLabel("bun"),
        getLanguageLabel(),
        getHostLabel(),
        getThreadLabel(workerId && `bun-worker-${workerId}`),
        ...getEnvironmentLabels(),
        ...getSuiteLabels(suitePath),
        ...labels,
      );

      if (task.file) {
        result.labels.push({
          name: LabelName.PACKAGE,
          value: task.file.replace(/\//g, "."),
        });
      }

      result.links.push(...links);
      switch (task.state) {
        case "fail": {
          const error = task.error;
          if (error) {
            result.status = getStatusFromError(error);
            result.statusDetails = getMessageAndTraceFromError(error);
          } else {
            result.status = Status.FAILED;
          }
          result.stage = Stage.FINISHED;
          break;
        }
        case "pass": {
          result.status = Status.PASSED;
          result.stage = Stage.FINISHED;
          break;
        }
        case "skip":
        case "todo": {
          result.status = Status.SKIPPED;
          result.stage = Stage.PENDING;
          if (task.state === "todo") {
            result.statusDetails = { message: "TODO" };
          }
          break;
        }
      }
    });

    this.runtime.stopTest(testUuid, { duration: task.duration ?? 0 });
    this.runtime.writeTest(testUuid);
  }

  onComplete(): void {}
}

export const createReporter = (config?: ReporterConfig): AllureBunReporter => {
  return new AllureBunReporter(config);
};
