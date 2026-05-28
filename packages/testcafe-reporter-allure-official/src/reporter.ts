import { ContentType, LabelName, Stage, Status } from "allure-js-commons";
import { getMessageAndTraceFromError } from "allure-js-commons/sdk";
import {
  ReporterRuntime,
  createDefaultWriter,
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getPackageLabel,
  getSuiteLabels,
  getThreadLabel,
} from "allure-js-commons/sdk/reporter";

import { installGlobalTestRuntime } from "./globalRuntime.js";
import type {
  AllureTestCafeReporterConfig,
  FixtureState,
  StartedTestGroupState,
  StartedTestState,
  TestCafeReporterActionInfo,
  TestCafeReporterContext,
  TestCafeReporterWarningInfo,
  TestCafeReporterPlugin,
  TestCafeTaskResult,
  TestCafeTestRunInfo,
  TestCafeTestStartInfo,
} from "./model.js";
import {
  buildStartedTestState,
  createFixtureState,
  createTestQueueKey,
  formatActionStepName,
  getActionStatusFromError,
  getBrowserInfoByTestRunId,
  getBrowserName,
  getFormattedErrorText,
  getPackageLabelValueFromRelativePath,
  getQuarantineAttachmentContent,
  getReporterStatusFromErrors,
  getRuntimeMessagesByTestRun,
  getScreenshotEntries,
  getScreenshotName,
  getStatusDetailsFromTestCafeError,
  getVideoEntries,
  getVideoName,
  getWarningAttachmentContent,
  isAllureRuntimeEnvelope,
  isIgnoredActionStep,
  mergeFixtureAndTestMeta,
  normalizeMeta,
  updateStatusDetailsFromFallback,
} from "./utils.js";

const EMPTY_FIXTURE_STATE: FixtureState = {
  name: "",
  path: "",
  relativePath: "",
  meta: {},
};

const ACTION_INTERRUPTED_MESSAGE = "Test finished before the TestCafe action step completed";
const DUPLICATE_NAME_INDEX_PARAMETER = "testcafe.internal.sameNameIndex";

const getErrorTestRunId = (error: unknown) =>
  typeof error === "object" && error !== null && typeof (error as { testRunId?: unknown }).testRunId === "string"
    ? (error as { testRunId: string }).testRunId
    : undefined;

class AllureTestCafeReporter {
  private readonly runtime: ReporterRuntime;
  private currentFixture: FixtureState = EMPTY_FIXTURE_STATE;
  private readonly startedTests = new Map<string, StartedTestGroupState[]>();
  private readonly sameNameIndexByQueueKey = new Map<string, number>();
  private readonly startedTestsByRunId = new Map<string, StartedTestState>();
  private readonly actionStepsByRunId = new Map<string, Map<string, string>>();
  private readonly knownActionStepsByRunId = new Map<string, Map<string, string>>();
  private readonly liveRuntimeRuns = new Set<string>();
  private readonly assertionDetailsByRunId = new Map<string, { actual?: string; expected?: string }>();
  private readonly warningsByRunId = new Map<string, Map<string, string[]>>();
  private testCafeVersion?: string;

  constructor(private readonly config: AllureTestCafeReporterConfig = {}) {
    const { resultsDir, captureActionsAsSteps: _captureActionsAsSteps, ...restConfig } = config;

    this.runtime = new ReporterRuntime({
      ...restConfig,
      writer: createDefaultWriter({ resultsDir }),
    });
  }

  createPlugin = (): TestCafeReporterPlugin => {
    const finishTest = this.finishTest;

    return {
      noColors: true,
      init: (version) => {
        installGlobalTestRuntime();
        this.testCafeVersion = version;
      },
      reportTaskStart: async () => {},
      reportFixtureStart: async (name, filePath, meta) => {
        this.currentFixture = createFixtureState(name, filePath, normalizeMeta(meta));
      },
      reportTestStart: async (name, meta, testStartInfo) => {
        this.startTest(name, normalizeMeta(meta), testStartInfo);
      },
      reportTestActionStart: async (apiActionName, info) => {
        this.handleTestActionStart(apiActionName, info);
      },
      reportTestActionDone: async (apiActionName, info) => {
        this.handleTestActionDone(apiActionName, info);
      },
      reportWarnings: async (warningInfo) => {
        this.handleWarning(warningInfo);
      },
      reportData: async (testRunInfo, ...data) => {
        this.handleReportData(testRunInfo.testRunId, data);
      },
      async reportTestDone(this: TestCafeReporterContext, name, testRunInfo, meta) {
        await finishTest(this, name, testRunInfo, normalizeMeta(meta));
      },
      reportTaskDone: async (_endTime: Date, _passed: number, _warnings: string[], _result: TestCafeTaskResult) => {
        this.runtime.writeEnvironmentInfo();
        this.runtime.writeCategoriesDefinitions();
      },
    };
  };

  private get captureActionsAsSteps() {
    return this.config.captureActionsAsSteps !== false;
  }

  private startTest(rawName: string, testMeta: Record<string, unknown>, testStartInfo: TestCafeTestStartInfo = {}) {
    const mergedMeta = mergeFixtureAndTestMeta(this.currentFixture.meta, testMeta);
    const staticMetadata = buildStartedTestState(rawName, this.currentFixture, mergedMeta, this.config.links);
    const queueKey = createTestQueueKey(this.currentFixture, rawName);
    const currentQueue = this.startedTests.get(queueKey) ?? [];
    const sameNameIndex = (this.sameNameIndexByQueueKey.get(queueKey) ?? 0) + 1;
    const labels = [
      getLanguageLabel(),
      getFrameworkLabel("testcafe"),
      getHostLabel(),
      getThreadLabel(),
      ...getEnvironmentLabels(),
      ...staticMetadata.labels,
      ...getSuiteLabels(staticMetadata.titlePath),
    ];

    this.sameNameIndexByQueueKey.set(queueKey, sameNameIndex);

    if (this.currentFixture.relativePath) {
      labels.push({
        ...getPackageLabel(this.currentFixture.relativePath),
        value: getPackageLabelValueFromRelativePath(this.currentFixture.relativePath),
      });
    }

    const runIds = testStartInfo.testRunIds?.length ? testStartInfo.testRunIds : [undefined];
    const startedGroup: StartedTestGroupState = {
      rawName,
      fixture: this.currentFixture,
      meta: mergedMeta,
      startedTests: runIds.map((testRunId) => {
        const testUuid = this.runtime.startTest({
          name: staticMetadata.cleanTitle,
          fullName: staticMetadata.fullName,
          titlePath: staticMetadata.titlePath,
          labels,
          links: staticMetadata.links,
          parameters:
            sameNameIndex > 1
              ? [
                  ...staticMetadata.parameters,
                  { name: DUPLICATE_NAME_INDEX_PARAMETER, value: `${sameNameIndex}`, mode: "hidden" },
                ]
              : [...staticMetadata.parameters],
          stage: Stage.RUNNING,
          start: testStartInfo.startTime?.getTime(),
        });

        const startedTest: StartedTestState = {
          rawName,
          cleanTitle: staticMetadata.cleanTitle,
          fullName: staticMetadata.fullName,
          titlePath: staticMetadata.titlePath,
          testUuid,
          testRunId,
          fixture: this.currentFixture,
          meta: mergedMeta,
        };

        if (testRunId) {
          this.startedTestsByRunId.set(testRunId, startedTest);
        }

        return startedTest;
      }),
    };

    currentQueue.push(startedGroup);
    this.startedTests.set(queueKey, currentQueue);
  }

  private finishTest = async (
    context: TestCafeReporterContext,
    rawName: string,
    testRunInfo: TestCafeTestRunInfo,
    testMeta: Record<string, unknown>,
  ) => {
    const startedGroup = this.takeStartedTestGroup(rawName, testMeta);
    const errors = testRunInfo.errs ?? [];
    const warnings = testRunInfo.warnings ?? [];
    const browsers = testRunInfo.browsers ?? [];
    const errorsByTestRunId = errors.reduce<Map<string, unknown[]>>((acc, error) => {
      const testRunId = getErrorTestRunId(error);

      if (testRunId) {
        const groupedErrors = acc.get(testRunId) ?? [];
        groupedErrors.push(error);
        acc.set(testRunId, groupedErrors);
      }

      return acc;
    }, new Map<string, unknown[]>());
    const runtimeMessagesByTestRun = getRuntimeMessagesByTestRun(testRunInfo);
    const allRuntimeMessages = Object.values(runtimeMessagesByTestRun).flat();
    const browserInfoByTestRunId = getBrowserInfoByTestRunId(browsers);
    const screenshots = getScreenshotEntries(testRunInfo);
    const videos = getVideoEntries(testRunInfo);
    const hasRunScopedWarnings = startedGroup.startedTests.some((startedTest) =>
      Boolean(startedTest.testRunId && this.warningsByRunId.has(startedTest.testRunId)),
    );

    startedGroup.startedTests.forEach((startedTest) => {
      const browser = startedTest.testRunId ? browserInfoByTestRunId.get(startedTest.testRunId) : undefined;
      const browserName = getBrowserName(browser);
      const runErrors =
        startedTest.testRunId && errorsByTestRunId.has(startedTest.testRunId)
          ? (errorsByTestRunId.get(startedTest.testRunId) ?? [])
          : startedGroup.startedTests.length === 1
            ? errors
            : [];
      const rawWrapperStatusDetails: { message?: string; trace?: string } = runErrors[0]
        ? getMessageAndTraceFromError(runErrors[0] as Partial<Error>)
        : {};
      const baseStatusDetails: { message?: string; trace?: string; actual?: string; expected?: string } = runErrors[0]
        ? getStatusDetailsFromTestCafeError(runErrors[0])
        : {};
      const assertionDetails = startedTest.testRunId
        ? this.assertionDetailsByRunId.get(startedTest.testRunId)
        : undefined;
      const formattedErrors = getFormattedErrorText(context.formatError, runErrors, context);
      const runtimeMessages =
        startedTest.testRunId && runtimeMessagesByTestRun[startedTest.testRunId]
          ? runtimeMessagesByTestRun[startedTest.testRunId]
          : startedGroup.startedTests.length === 1
            ? allRuntimeMessages
            : [];
      const statusResult = testRunInfo.skipped
        ? {
            status: Status.SKIPPED,
          }
        : getReporterStatusFromErrors(runErrors);
      const statusDetails = updateStatusDetailsFromFallback(
        {
          ...baseStatusDetails,
          actual: baseStatusDetails.actual ?? assertionDetails?.actual,
          expected: baseStatusDetails.expected ?? assertionDetails?.expected,
        },
        formattedErrors ?? statusResult.formattedErrors,
      );

      if ((!startedTest.testRunId || !this.liveRuntimeRuns.has(startedTest.testRunId)) && runtimeMessages.length > 0) {
        this.runtime.applyRuntimeMessages(startedTest.testUuid, runtimeMessages);
      }

      this.finalizeRunningActionSteps(startedTest);

      if (
        formattedErrors &&
        (runErrors.length > 1 || !rawWrapperStatusDetails.trace || !rawWrapperStatusDetails.message)
      ) {
        this.runtime.writeAttachment(startedTest.testUuid, undefined, "Errors", Buffer.from(formattedErrors, "utf8"), {
          contentType: ContentType.TEXT,
        });
      }

      this.writeWarningsForStartedTest(startedTest, warnings, hasRunScopedWarnings);

      if (testRunInfo.quarantine && Object.keys(testRunInfo.quarantine).length > 0) {
        this.runtime.writeAttachment(
          startedTest.testUuid,
          undefined,
          "Quarantine",
          Buffer.from(getQuarantineAttachmentContent(testRunInfo.quarantine), "utf8"),
          {
            contentType: ContentType.JSON,
          },
        );
      }

      this.getScreenshotsForStartedTest(startedGroup.startedTests, startedTest, browserName, screenshots).forEach(
        (screenshot, index) => {
          this.runtime.writeAttachment(
            startedTest.testUuid,
            startedTest.testRunId ? this.getKnownActionStepUuid(startedTest.testRunId, screenshot.actionId) : undefined,
            getScreenshotName(screenshot, index),
            screenshot.screenshotPath,
            {
              contentType: ContentType.PNG,
            },
          );
        },
      );

      this.getVideosForStartedTest(startedGroup.startedTests, startedTest, videos).forEach((video, index) => {
        this.runtime.writeAttachment(startedTest.testUuid, undefined, getVideoName(video, index), video.videoPath, {
          contentType: ContentType.MP4,
        });
      });

      this.runtime.updateTest(startedTest.testUuid, (result) => {
        result.status = statusResult.status;
        result.stage = statusResult.status === Status.SKIPPED ? Stage.PENDING : Stage.FINISHED;
        result.statusDetails = statusDetails;

        if (browserName) {
          result.parameters.push({ name: "Browser", value: browserName });
        }

        if (testRunInfo.unstable) {
          result.labels.push({ name: LabelName.TAG, value: "unstable" });
        }
      });

      this.runtime.stopTest(startedTest.testUuid, { duration: testRunInfo.durationMs });
      this.runtime.writeTest(startedTest.testUuid);
      this.cleanupActionState(startedTest);
    });
  };

  private handleReportData(testRunId: string, data: unknown[]) {
    const startedTest = this.startedTestsByRunId.get(testRunId);
    if (!startedTest) {
      return;
    }

    const runtimeMessages = data.filter(isAllureRuntimeEnvelope).map((value) => value.message);

    if (runtimeMessages.length === 0) {
      return;
    }

    this.runtime.applyRuntimeMessages(startedTest.testUuid, runtimeMessages);
    this.liveRuntimeRuns.add(testRunId);
  }

  private handleWarning({ message, testRunId, actionId }: TestCafeReporterWarningInfo) {
    if (!testRunId) {
      return;
    }

    const warningsByActionId = this.warningsByRunId.get(testRunId) ?? new Map<string, string[]>();
    const warningKey = actionId ?? "";
    const warnings = warningsByActionId.get(warningKey) ?? [];

    warnings.push(message);
    warningsByActionId.set(warningKey, warnings);
    this.warningsByRunId.set(testRunId, warningsByActionId);
  }

  private handleTestActionStart(apiActionName: string, info: TestCafeReporterActionInfo) {
    if (!this.captureActionsAsSteps || isIgnoredActionStep(apiActionName)) {
      return;
    }

    const startedTest = this.startedTestsByRunId.get(info.testRunId);
    if (!startedTest) {
      return;
    }

    const actionId = typeof info.command.actionId === "string" ? info.command.actionId : undefined;
    if (!actionId) {
      return;
    }

    const stepUuid = this.runtime.startStep(startedTest.testUuid, undefined, {
      name: formatActionStepName(apiActionName, info.command),
    });

    if (!stepUuid) {
      return;
    }

    const activeActionSteps = this.actionStepsByRunId.get(info.testRunId) ?? new Map<string, string>();
    const knownActionSteps = this.knownActionStepsByRunId.get(info.testRunId) ?? new Map<string, string>();

    activeActionSteps.set(actionId, stepUuid);
    knownActionSteps.set(actionId, stepUuid);
    this.actionStepsByRunId.set(info.testRunId, activeActionSteps);
    this.knownActionStepsByRunId.set(info.testRunId, knownActionSteps);
  }

  private handleTestActionDone(apiActionName: string, info: TestCafeReporterActionInfo) {
    if (!this.captureActionsAsSteps || isIgnoredActionStep(apiActionName)) {
      return;
    }

    const startedTest = this.startedTestsByRunId.get(info.testRunId);
    if (!startedTest) {
      return;
    }

    const actionId = typeof info.command.actionId === "string" ? info.command.actionId : undefined;
    const activeActionSteps = this.actionStepsByRunId.get(info.testRunId);
    let stepUuid = actionId ? activeActionSteps?.get(actionId) : undefined;

    if (!stepUuid) {
      stepUuid = this.runtime.startStep(startedTest.testUuid, undefined, {
        name: formatActionStepName(apiActionName, info.command),
      });
    }

    if (!stepUuid) {
      return;
    }

    if (actionId) {
      const knownActionSteps = this.knownActionStepsByRunId.get(info.testRunId) ?? new Map<string, string>();
      knownActionSteps.set(actionId, stepUuid);
      this.knownActionStepsByRunId.set(info.testRunId, knownActionSteps);
    }

    if (info.err) {
      const errorInfo = getActionStatusFromError(info.err, info.command);

      this.runtime.updateStep(stepUuid, (stepResult) => {
        stepResult.status = errorInfo.status;
        stepResult.statusDetails = errorInfo.statusDetails;
      });

      if (startedTest.testRunId && (errorInfo.statusDetails.actual || errorInfo.statusDetails.expected)) {
        this.assertionDetailsByRunId.set(startedTest.testRunId, {
          actual: errorInfo.statusDetails.actual,
          expected: errorInfo.statusDetails.expected,
        });
      }
    } else {
      this.runtime.updateStep(stepUuid, (stepResult) => {
        stepResult.status ??= Status.PASSED;
      });
    }

    if (typeof info.duration === "number") {
      this.runtime.stopStep(stepUuid, { duration: info.duration });
    } else {
      this.runtime.stopStep(stepUuid, { stop: Date.now() });
    }

    if (actionId && activeActionSteps) {
      activeActionSteps.delete(actionId);
      if (activeActionSteps.size === 0) {
        this.actionStepsByRunId.delete(info.testRunId);
      }
    }
  }

  private finalizeRunningActionSteps(startedTest: StartedTestState) {
    if (!startedTest.testRunId) {
      return;
    }

    const activeActionSteps = this.actionStepsByRunId.get(startedTest.testRunId);

    if (!activeActionSteps) {
      return;
    }

    activeActionSteps.forEach((stepUuid) => {
      this.runtime.updateStep(stepUuid, (stepResult) => {
        stepResult.status ??= Status.BROKEN;
        stepResult.statusDetails = {
          ...stepResult.statusDetails,
          message: stepResult.statusDetails?.message ?? ACTION_INTERRUPTED_MESSAGE,
          trace: stepResult.statusDetails?.trace ?? ACTION_INTERRUPTED_MESSAGE,
        };
      });

      this.runtime.stopStep(stepUuid, { stop: Date.now() });
    });

    this.actionStepsByRunId.delete(startedTest.testRunId);
  }

  private cleanupActionState(startedTest: StartedTestState) {
    if (!startedTest.testRunId) {
      return;
    }

    this.startedTestsByRunId.delete(startedTest.testRunId);
    this.actionStepsByRunId.delete(startedTest.testRunId);
    this.knownActionStepsByRunId.delete(startedTest.testRunId);
    this.liveRuntimeRuns.delete(startedTest.testRunId);
    this.assertionDetailsByRunId.delete(startedTest.testRunId);
    this.warningsByRunId.delete(startedTest.testRunId);
  }

  private getScreenshotsForStartedTest(
    startedTests: StartedTestState[],
    startedTest: StartedTestState,
    browserName: string | undefined,
    screenshots: TestCafeTestRunInfo["screenshots"],
  ) {
    if (!screenshots?.length) {
      return [];
    }

    if (startedTests.length === 1) {
      return screenshots;
    }

    if (!startedTest.testRunId) {
      return [];
    }

    const runScopedScreenshots = screenshots.filter((screenshot) => screenshot.testRunId === startedTest.testRunId);

    if (runScopedScreenshots.length > 0) {
      return runScopedScreenshots;
    }

    if (!browserName) {
      return [];
    }

    return screenshots.filter((screenshot) => screenshot.userAgent === browserName);
  }

  private getVideosForStartedTest(
    startedTests: StartedTestState[],
    startedTest: StartedTestState,
    videos: TestCafeTestRunInfo["videos"],
  ) {
    if (!videos?.length) {
      return [];
    }

    if (startedTests.length === 1) {
      return videos;
    }

    if (!startedTest.testRunId) {
      return [];
    }

    return videos.filter((video) => video.testRunId === startedTest.testRunId);
  }

  private getKnownActionStepUuid(testRunId: string, actionId?: string) {
    if (!actionId) {
      return undefined;
    }

    return this.knownActionStepsByRunId.get(testRunId)?.get(actionId);
  }

  private writeWarningsForStartedTest(
    startedTest: StartedTestState,
    fallbackWarnings: string[],
    hasRunScopedWarnings: boolean,
  ) {
    const runWarningsByActionId = startedTest.testRunId ? this.warningsByRunId.get(startedTest.testRunId) : undefined;

    if (!runWarningsByActionId) {
      if (fallbackWarnings.length === 0 || hasRunScopedWarnings) {
        return;
      }

      this.runtime.writeAttachment(
        startedTest.testUuid,
        undefined,
        "Warnings",
        Buffer.from(getWarningAttachmentContent(fallbackWarnings), "utf8"),
        {
          contentType: ContentType.TEXT,
        },
      );
      return;
    }

    const testLevelWarnings = [...(runWarningsByActionId.get("") ?? [])];

    runWarningsByActionId.forEach((warnings, actionId) => {
      if (actionId === "") {
        return;
      }

      const stepUuid = startedTest.testRunId ? this.getKnownActionStepUuid(startedTest.testRunId, actionId) : undefined;

      if (!stepUuid) {
        testLevelWarnings.push(...warnings);
        return;
      }

      this.runtime.writeAttachment(
        startedTest.testUuid,
        stepUuid,
        "Warnings",
        Buffer.from(getWarningAttachmentContent(warnings), "utf8"),
        {
          contentType: ContentType.TEXT,
        },
      );
    });

    if (testLevelWarnings.length > 0) {
      this.runtime.writeAttachment(
        startedTest.testUuid,
        undefined,
        "Warnings",
        Buffer.from(getWarningAttachmentContent(testLevelWarnings), "utf8"),
        {
          contentType: ContentType.TEXT,
        },
      );
    }
  }

  private takeStartedTestGroup(rawName: string, testMeta: Record<string, unknown>): StartedTestGroupState {
    const queueKey = createTestQueueKey(this.currentFixture, rawName);
    const queue = this.startedTests.get(queueKey);
    if (queue?.length) {
      const startedGroup = queue.shift()!;
      if (queue.length === 0) {
        this.startedTests.delete(queueKey);
      }
      return startedGroup;
    }

    return this.createFallbackStartedTestGroup(rawName, testMeta);
  }

  private createFallbackStartedTestGroup(rawName: string, testMeta: Record<string, unknown>): StartedTestGroupState {
    const mergedMeta = mergeFixtureAndTestMeta(this.currentFixture.meta, testMeta);
    const staticMetadata = buildStartedTestState(rawName, this.currentFixture, mergedMeta, this.config.links);
    const labels = [
      getLanguageLabel(),
      getFrameworkLabel("testcafe"),
      getHostLabel(),
      getThreadLabel(),
      ...getEnvironmentLabels(),
      ...staticMetadata.labels,
      ...getSuiteLabels(staticMetadata.titlePath),
    ];

    if (this.currentFixture.relativePath) {
      labels.push({
        ...getPackageLabel(this.currentFixture.relativePath),
        value: getPackageLabelValueFromRelativePath(this.currentFixture.relativePath),
      });
    }

    const testUuid = this.runtime.startTest({
      name: staticMetadata.cleanTitle,
      fullName: staticMetadata.fullName,
      titlePath: staticMetadata.titlePath,
      labels,
      links: staticMetadata.links,
      parameters: staticMetadata.parameters,
      stage: Stage.RUNNING,
    });

    return {
      rawName,
      fixture: this.currentFixture,
      meta: mergedMeta,
      startedTests: [
        {
          rawName,
          cleanTitle: staticMetadata.cleanTitle,
          fullName: staticMetadata.fullName,
          titlePath: staticMetadata.titlePath,
          testUuid,
          fixture: this.currentFixture,
          meta: mergedMeta,
        },
      ],
    };
  }
}

export const createReporterObject = (config: AllureTestCafeReporterConfig = {}) => {
  const reporter = new AllureTestCafeReporter(config);
  return reporter.createPlugin();
};
