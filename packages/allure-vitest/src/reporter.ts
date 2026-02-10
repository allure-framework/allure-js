import type { RunnerTask as Task } from "vitest";
import type { TestModule } from "vitest/node";
import type { Reporter } from "vitest/reporters";
import { Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import {
  ReporterRuntime,
  createDefaultWriter,
  getEnvironmentLabels,
  getFallbackTestCaseIdLabel,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getLegacyTestCaseIdFromFullName,
  getPackageLabel,
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

    this.allureReporterRuntime.writeCategoriesDefinitions();
    this.allureReporterRuntime.writeEnvironmentInfo();
  }

  // eslint-disable-next-line @typescript-eslint/array-type
  onTestRunEnd(tests: ReadonlyArray<TestModule>) {
    for (const test of tests) {
      // actually there's the task property in the test object
      // @ts-ignore
      if (!test?.task) {
        continue;
      }

      // @ts-ignore
      this.handleTask(test.task as unknown as Task);
    }
  }

  handleTask(task: Task) {
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

    const {
      projectName,
      specPath,
      fullName,
      legacyFullName,
      name,
      suitePath,
      labels: metadataLabels,
      links: metadataLinks,
    } = getTestMetadata(task);
    const testUuid = this.allureReporterRuntime!.startTest({
      name,
      start: task.result?.startTime,
    });

    this.allureReporterRuntime!.updateTest(testUuid, (result) => {
      const suiteLabels = getSuiteLabels(suitePath);
      const fsPath = specPath.split("/");
      const baseTitlePath = [...fsPath, ...suitePath];
      const titlePath = projectName ? [projectName, ...baseTitlePath] : baseTitlePath;

      result.fullName = fullName;
      result.titlePath = titlePath;
      result.labels.push(getFrameworkLabel("vitest"));
      result.labels.push(getLanguageLabel());
      result.labels.push(...metadataLabels);
      result.labels.push(...suiteLabels);
      result.labels.push(...getEnvironmentLabels());
      result.labels.push(getHostLabel());
      result.labels.push(getThreadLabel(VITEST_POOL_ID && `vitest-worker-${VITEST_POOL_ID}`));
      result.labels.push(getFallbackTestCaseIdLabel(getLegacyTestCaseIdFromFullName(legacyFullName)));
      result.links.push(...metadataLinks);

      if (task.file.filepath) {
        result.labels.push(getPackageLabel(task.file.filepath));
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
