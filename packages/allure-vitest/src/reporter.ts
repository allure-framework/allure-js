import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

import { ContentType, Stage, Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { getMessageAndTraceFromError, getStatusFromError, toGlobalErrorMessage } from "allure-js-commons/sdk";
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
import type { AllureVitestAttempt, TaskResultLike, VitestArtifact } from "./vitest-artifacts.js";

const localRequire = createRequire(import.meta.url);

export type AllureVitestReporterConfig = ReporterConfig & {
  reportMatchers?: boolean;
};

type HookName = "beforeAll" | "beforeEach" | "afterEach" | "afterAll";

const hookNames: HookName[] = ["beforeAll", "beforeEach", "afterEach", "afterAll"];

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
  }

  handleTask(task: Task) {
    // do not report skipped tests
    if (task.mode === "skip" && !task.result) {
      return;
    }

    const hookGlobalMessages = getHookGlobalErrorMessages(task);

    if (hookGlobalMessages.length) {
      this.globalRuntimeMessages.push(...hookGlobalMessages);
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
      allureAttempts = [],
      allureCurrentAttempt,
      allureSkip = false,
    } = task.meta;

    // do not report tests skipped by test plan
    if (allureSkip) {
      return;
    }

    if (allureGlobalRuntimeMessages.length) {
      this.globalRuntimeMessages.push(...allureGlobalRuntimeMessages);
    }

    const finalAttemptResult =
      task.result && allureCurrentAttempt
        ? {
            ...task.result,
            startTime: allureCurrentAttempt.startTime,
            duration: allureCurrentAttempt.duration ?? 0,
            retryCount: allureCurrentAttempt.retryCount,
            repeatCount: allureCurrentAttempt.repeatCount,
            // test.fails replaces the accumulated errors when it inverts the final outcome.
            errors: task.fails ? task.result.errors : task.result.errors?.slice(allureCurrentAttempt.errorOffset),
          }
        : task.result;
    const artifacts = task.artifacts ?? [];

    // Earlier attempts were finalized at the next beforeEach; the final task is always authoritative.
    const attempts: AllureVitestAttempt[] = [
      ...allureAttempts,
      {
        result: finalAttemptResult,
        runtimeMessages: allureRuntimeMessages,
        artifactStart: allureCurrentAttempt?.artifactStart,
      },
    ];

    for (const attempt of attempts) {
      this.writeTaskAttempt(task, attempt, artifacts);
    }
  }

  private writeTaskAttempt(
    task: Task,
    {
      result: taskResult,
      runtimeMessages: allureRuntimeMessages = [],
      artifactStart = 0,
      artifactEnd,
    }: AllureVitestAttempt,
    artifacts: VitestArtifact[],
  ) {
    const { vitestWorker, browser } = task.meta;
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
      start: taskResult?.startTime,
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

      switch (taskResult?.state) {
        case "fail": {
          const [error] = taskResult.errors || [];
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

      if (browser && (taskResult?.retryCount ?? 0) > 0) {
        result.parameters.push({ name: "Retry", value: String(taskResult?.retryCount), excluded: true });
      }
    });

    this.writeTaskArtifacts(testUuid, artifacts.slice(artifactStart, artifactEnd));
    this.writeTaskTrace(testUuid, task, taskResult);

    this.allureReporterRuntime!.stopTest(testUuid, { duration: taskResult?.duration ?? 0 });
    this.allureReporterRuntime!.writeTest(testUuid);
  }

  private writeTaskArtifacts(testUuid: string, artifacts: VitestArtifact[]) {
    for (const artifact of artifacts) {
      if (artifact.type === "internal:failureScreenshot") {
        this.writeArtifactAttachments(testUuid, artifact, "Failure screenshot");
      }

      if (artifact.type === "internal:toMatchScreenshot") {
        this.writeArtifactAttachments(testUuid, artifact, artifact.message ?? "Screenshot diff");
      }
    }
  }

  private writeArtifactAttachments(testUuid: string, artifact: VitestArtifact, fallbackName: string) {
    for (const attachment of artifact.attachments ?? []) {
      const contentType = attachment.contentType ?? ContentType.PNG;
      const name = attachment.name ?? (attachment.path ? basename(attachment.path) : fallbackName);

      if (attachment.path) {
        this.allureReporterRuntime!.writeAttachment(testUuid, undefined, name, attachment.path, {
          contentType,
        });
        continue;
      }

      if (attachment.body) {
        this.allureReporterRuntime!.writeAttachment(testUuid, undefined, name, Buffer.from(attachment.body), {
          contentType,
        });
      }
    }
  }

  private writeTaskTrace(testUuid: string, task: Task, taskResult: TaskResultLike | undefined) {
    const tracePath = getBrowserTracePath(task, taskResult);

    if (!tracePath || !existsSync(tracePath)) {
      return;
    }

    this.allureReporterRuntime!.writeAttachment(testUuid, undefined, "Trace", tracePath, {
      contentType: ContentType.PLAYWRIGHT_TRACE,
      fileExtension: ".zip",
    });
  }
}

const getHookGlobalErrorMessages = (task: Task): RuntimeMessage[] => {
  const { hooks, errors } = task.result ?? {};

  if (!hooks || !errors?.length) {
    return [];
  }

  const failedHookNames = hookNames.filter((name) => {
    const state = hooks[name];

    return state && state !== "pass" && state !== "skip";
  });

  if (!failedHookNames.length) {
    return [];
  }

  const hookErrors = errors.slice(-failedHookNames.length);

  return failedHookNames.flatMap((name, index) => {
    const error = hookErrors[index];

    if (!error) {
      return [];
    }

    return [
      toGlobalErrorMessage({
        name: `${name} hook`,
        details: getMessageAndTraceFromError(error),
        status: getStatusFromError(error),
      }),
    ];
  });
};

const getBrowserTracePath = (task: Task, result: TaskResultLike | undefined): string | undefined => {
  if (task.type !== "test" || !task.meta.browser) {
    return undefined;
  }

  // Vitest publishes trace annotations after all retries, so read them from the completed task.
  // Paths come from Vitest (including custom tracesDir); the suffix identifies the attempt within this task.
  const attemptSuffix = `-${result?.repeatCount ?? 0}-${result?.retryCount ?? 0}.trace.zip`;
  const hasMultipleAttempts = (task.meta.allureAttempts?.length ?? 0) > 0;

  return task.annotations?.find(
    ({ type, attachment, message }) =>
      type === "traces" && attachment?.path && (!hasMultipleAttempts || message.endsWith(attemptSuffix)),
  )?.attachment?.path;
};
