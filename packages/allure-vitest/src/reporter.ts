import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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
  getPackageLabel,
  getSuiteLabels,
  getThreadLabel,
  md5,
} from "allure-js-commons/sdk/reporter";
import type { RunnerTask as Task } from "vitest";
import type { TestModule, Vitest } from "vitest/node";
import type { Reporter } from "vitest/reporters";

import { commands as allureBrowserCommands } from "./browser/index.js";
import { isMatcherMessage } from "./matcherMessages.js";
import { takeGlobalRuntimeMessages } from "./runtime.js";
import { getTestMetadata } from "./utils.js";

const localRequire = createRequire(import.meta.url);

export type AllureVitestReporterConfig = ReporterConfig & {
  reportMatchers?: boolean;
};

const setupModulePath = fileURLToPath(new URL("./setup.js", import.meta.url));

const browserSetupModulePath = fileURLToPath(new URL("./browser/setup.js", import.meta.url));

const normalizeSetupFilePath = (setupFilePath: string) =>
  setupFilePath.startsWith("file://") ? fileURLToPath(setupFilePath) : setupFilePath;

export default class AllureVitestReporter implements Reporter {
  private allureReporterRuntime?: ReporterRuntime;
  private config: AllureVitestReporterConfig;
  private globalRuntimeMessages: RuntimeMessage[] = [];

  constructor(config: AllureVitestReporterConfig) {
    this.config = config;
  }

  onInit(vitest: Vitest) {
    this.registerSetupFile(vitest);
    this.enableConcurrencySupport(vitest);

    const { listeners, resultsDir, reportMatchers: _reportMatchers, ...config } = this.config;

    this.allureReporterRuntime = new ReporterRuntime({
      ...config,
      writer: createDefaultWriter({ resultsDir }),
      listeners,
    });

    this.allureReporterRuntime.registerProcessExitHandler();
    this.allureReporterRuntime.writeCategoriesDefinitions();
    this.allureReporterRuntime.writeEnvironmentInfo();
    this.globalRuntimeMessages = [];
  }

  private registerSetupFile(vitest: Vitest) {
    for (const project of vitest.projects) {
      const setupFilePath = project.config.browser.enabled ? browserSetupModulePath : setupModulePath;

      const hasSetupFile = project.config.setupFiles.some(
        (setupFile) => normalizeSetupFilePath(setupFile) === setupFilePath,
      );

      if (!hasSetupFile) {
        project.config.setupFiles.unshift(setupFilePath);
      }

      if (project.config.browser.enabled) {
        project.config.browser.commands ??= {};

        for (const [name, command] of Object.entries(allureBrowserCommands)) {
          project.config.browser.commands[name] ??= command;
        }
      }
    }
  }

  private enableConcurrencySupport(vitest: Vitest) {
    for (const project of vitest.projects) {
      if (!project.config.browser.enabled) {
        project.provide("__allure_vitest_custom_runner_module__", project.config.runner);
        project.config.runner = localRequire.resolve("./runner.js");
      }
    }
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

    const globalMessages = [...this.globalRuntimeMessages, ...takeGlobalRuntimeMessages()];

    if (globalMessages.length) {
      this.allureReporterRuntime!.applyGlobalRuntimeMessages(globalMessages);
    }
    this.globalRuntimeMessages = [];

    this.allureReporterRuntime!.flushUnfinishedTests({
      message: "Vitest finished before reporting a test result",
    });
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
      allureGlobalRuntimeMessages = [],
      vitestWorker,
      browser,
      allureSkip = false,
    } = task.meta;

    // do not report tests skipped by test plan
    if (allureSkip) {
      return;
    }

    if (allureGlobalRuntimeMessages.length) {
      this.globalRuntimeMessages.push(...allureGlobalRuntimeMessages);
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
      result.labels.push(getThreadLabel(vitestWorker && `vitest-worker-${vitestWorker}`));
      result.labels.push(getFallbackTestCaseIdLabel(md5(legacyFullName)));
      result.links.push(...metadataLinks);

      if (browser) {
        result.parameters.push({
          name: "browser",
          value: browser,
        });
      }

      if (task.file.filepath) {
        result.labels.push(getPackageLabel(task.file.filepath));
      }

      const runtimeMessages =
        (this.config.reportMatchers ?? true)
          ? allureRuntimeMessages
          : allureRuntimeMessages.filter((m) => !isMatcherMessage(m));

      if (runtimeMessages.length) {
        this.allureReporterRuntime!.applyRuntimeMessages(testUuid, runtimeMessages);
      }

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
