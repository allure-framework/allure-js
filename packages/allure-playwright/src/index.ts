import { existsSync } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/* eslint max-lines: off */
import type { FullConfig } from "@playwright/test";
import type { TestResult as PlaywrightTestResult, Suite, TestCase, TestStep } from "@playwright/test/reporter";
import {
  ContentType,
  type ImageDiffAttachment,
  type Label,
  LabelName,
  LinkType,
  Stage,
  Status,
  type StepResult,
  type TestResult,
} from "allure-js-commons";
import type { RuntimeMessage, RuntimeStepMetadataMessage, TestPlanV1Test } from "allure-js-commons/sdk";
import {
  extractMetadataFromString,
  getMessageAndTraceFromError,
  getMetadataLabel,
  hasLabel,
  stripAnsi,
} from "allure-js-commons/sdk";
import {
  ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
  ReporterRuntime,
  ShallowStepsStack,
  createDefaultWriter,
  createStepResult,
  escapeRegExp,
  formatLink,
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  includedInTestPlan,
  getLanguageLabel,
  getPackageLabel,
  getThreadLabel,
  md5,
  parseTestPlan,
  randomUuid,
  readImageAsBase64,
} from "allure-js-commons/sdk/reporter";

import { allurePlaywrightLegacyApi } from "./legacy.js";
import type { AllurePlaywrightReporterConfig, AttachStack, AttachmentTarget, ReporterV2 } from "./model.js";
import {
  AFTER_HOOKS_ROOT_STEP_TITLE,
  BEFORE_HOOKS_ROOT_STEP_TITLE,
  diffEndRegexp,
  finalizeStepResult,
  isAfterHookStep,
  isBeforeHookStep,
  isDescendantOfStepWithTitle,
  normalizeAttachStepTitle,
  normalizeHookTitle,
  statusToAllureStats,
} from "./utils.js";

export class AllureReporter implements ReporterV2 {
  config!: FullConfig;
  suite!: Suite;
  options: AllurePlaywrightReporterConfig;
  outputDir: string | undefined;
  snapshotDir: string | undefined;

  private allureRuntime: ReporterRuntime | undefined;
  private globalStartTime = new Date();
  private processedDiffs: string[] = [];
  private readonly startedTestCasesTitlesCache: string[] = [];
  private readonly allureResultsUuids: Map<string, string> = new Map();
  private readonly attachmentTargets: Map<string, AttachmentTarget[]> = new Map();
  private beforeHooksStepsStack: Map<string, ShallowStepsStack> = new Map();
  private afterHooksStepsStack: Map<string, ShallowStepsStack> = new Map();
  private readonly pwStepUuid = new WeakMap<TestStep, string>();
  private readonly testPlan = parseTestPlan();

  constructor(config: AllurePlaywrightReporterConfig) {
    this.options = { suiteTitle: true, detail: true, flattenReport: false, ...config };
  }

  onConfigure(config: FullConfig): void {
    this.config = config;
    this.outputDir = config.projects[0].outputDir;
    this.snapshotDir = config.projects[0].snapshotDir;

    const testPlan = this.testPlan;

    if (!testPlan) {
      return;
    }

    // @ts-ignore
    const configElement = config[Object.getOwnPropertySymbols(config)[0]];

    if (!configElement) {
      return;
    }

    configElement.preOnlyTestFilters.push((test: TestCase) => this.isInTestPlan(test));

    if (testPlan.tests.some((test) => test.id !== undefined)) {
      return;
    }

    const testsWithSelectors = testPlan.tests.filter((test) => test.selector);

    const v1ReporterTests: TestPlanV1Test[] = [];
    const v2ReporterTests: TestPlanV1Test[] = [];
    const cliArgs: string[] = [];

    testsWithSelectors.forEach((test) => {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      if (!/#/.test(test.selector!)) {
        v2ReporterTests.push(test);
        return;
      }

      v1ReporterTests.push(test);
    });

    // The path needs to be specific to the current OS. Otherwise, it may not match against the test file.
    const selectorToGrepPattern = (selector: string) => escapeRegExp(path.normalize(`/${selector}`));

    if (v2ReporterTests.length) {
      // we need to cut off column because playwright works only with line number
      const v2SelectorsArgs = v2ReporterTests
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        .map((test) => test.selector!.replace(/:\d+$/, ""))
        .map(selectorToGrepPattern);

      cliArgs.push(...v2SelectorsArgs);
    }

    if (v1ReporterTests.length) {
      const v1SelectorsArgs = v1ReporterTests
        // we can filter tests only by absolute path, so we need to cut off test name
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        .map((test) => test.selector!.split("#")[0])
        .map(selectorToGrepPattern);

      cliArgs.push(...v1SelectorsArgs);
    }

    if (!cliArgs.length) {
      return;
    }

    configElement.cliArgs = cliArgs;
  }

  onError(): void {}

  onExit(): void {}

  onStdErr(): void {}

  onStdOut(): void {}

  onBegin(suite: Suite): void {
    this.suite = suite;
    this.allureRuntime = new ReporterRuntime({
      ...this.options,
      writer: createDefaultWriter({ resultsDir: this.options.resultsDir }),
    });
  }

  onTestBegin(test: TestCase) {
    const metadata = this.getStaticTestMetadata(test);
    const result: Partial<TestResult> = {
      name: metadata.titleMetadata.cleanTitle,
      labels: [...metadata.titleMetadata.labels, ...getEnvironmentLabels()],
      links: [...metadata.titleMetadata.links],
      parameters: [],
      steps: [],
      testCaseId: md5(metadata.testCaseIdBase),
      fullName: metadata.fullName,
      titlePath: metadata.relativeFileParts.concat(...metadata.suiteTitles),
    };

    result.labels!.push(getLanguageLabel());
    result.labels!.push(getFrameworkLabel("playwright"));
    result.labels!.push(getPackageLabel(metadata.testFilePath));
    result.labels!.push({ name: "titlePath", value: test.parent.titlePath().join(" > ") });

    // support for earlier playwright versions
    if ("tags" in test) {
      const tags: Label[] = test.tags.map((tag) => ({
        name: LabelName.TAG,
        value: tag.startsWith("@") ? tag.substring(1) : tag,
      }));
      result.labels!.push(...tags);
    }

    if ("annotations" in test) {
      for (const annotation of test.annotations) {
        if (annotation.type === "skip" || annotation.type === "fixme") {
          continue;
        }

        if (annotation.type === "issue") {
          result.links!.push(
            formatLink(this.options.links ?? {}, {
              type: LinkType.ISSUE,
              url: annotation.description!,
            }),
          );
          continue;
        }

        if (annotation.type === "tms" || annotation.type === "test_key") {
          result.links!.push(
            formatLink(this.options.links ?? {}, {
              type: LinkType.TMS,
              url: annotation.description!,
            }),
          );
          continue;
        }

        if (annotation.type === "description") {
          result.description = annotation.description;
          continue;
        }

        const annotationLabel = getMetadataLabel(annotation.type, annotation.description);

        if (annotationLabel) {
          result.labels!.push(annotationLabel);
          continue;
        }

        result.steps!.push({
          name: `${annotation.type}: ${annotation.description!}`,
          status: Status.PASSED,
          stage: Stage.FINISHED,
          parameters: [],
          steps: [],
          attachments: [],
          statusDetails: {},
        });
      }
    }

    if (metadata.project?.name) {
      result.parameters!.push({ name: "Project", value: metadata.project.name });
    }

    if (metadata.project?.repeatEach > 1) {
      result.parameters!.push({ name: "Repetition", value: `${test.repeatEachIndex + 1}` });
    }

    const testUuid = this.allureRuntime!.startTest(result);

    this.allureResultsUuids.set(test.id, testUuid);
    this.startedTestCasesTitlesCache.push(metadata.titleMetadata.cleanTitle);
  }

  #shouldIgnoreStep(step: TestStep) {
    if (!this.options.detail && !["test.step", "attach", "test.attach"].includes(step.category)) {
      return true;
    }

    // ignore noisy route.continue()
    if (step.category === "pw:api" && step.title === "route.continue()") {
      return true;
    }

    // playwright doesn't report this step
    if (step.title === "Worker Cleanup" || isDescendantOfStepWithTitle(step, "Worker Cleanup")) {
      return true;
    }

    return false;
  }

  #getOrCreateHookStack(testId: string, isBeforeHook: boolean, startTime: Date): ShallowStepsStack {
    const map = isBeforeHook ? this.beforeHooksStepsStack : this.afterHooksStepsStack;
    let stack = map.get(testId);
    if (!stack) {
      stack = new ShallowStepsStack();
      const rootHookStep: StepResult = {
        ...createStepResult(),
        name: isBeforeHook ? BEFORE_HOOKS_ROOT_STEP_TITLE : AFTER_HOOKS_ROOT_STEP_TITLE,
        start: startTime.getTime(),
        stage: Stage.RUNNING,
        uuid: randomUuid(),
      };
      stack.startStep(rootHookStep);
      map.set(testId, stack);
    }
    return stack;
  }

  onStepBegin(test: TestCase, _result: PlaywrightTestResult, step: TestStep): void {
    const isRootBeforeHook = step.title === BEFORE_HOOKS_ROOT_STEP_TITLE;
    const isRootAfterHook = step.title === AFTER_HOOKS_ROOT_STEP_TITLE;
    const isRootHook = isRootBeforeHook || isRootAfterHook;
    const isBeforeHookDescendant = isBeforeHookStep(step);
    const isAfterHookDescendant = isAfterHookStep(step);
    const isHookStep = isBeforeHookDescendant || isAfterHookDescendant;
    const testUuid = this.allureResultsUuids.get(test.id)!;

    if (this.#shouldIgnoreStep(step)) {
      return;
    }

    const baseStep: StepResult = {
      ...createStepResult(),
      name: step.title,
      start: step.startTime.getTime(),
      stage: Stage.RUNNING,
      uuid: randomUuid(),
    };

    if (["test.attach", "attach"].includes(step.category) && !isHookStep) {
      const parent = step.parent ? (this.pwStepUuid.get(step.parent) ?? null) : null;
      const targets = this.attachmentTargets.get(test.id) ?? [];
      targets.push({ name: normalizeAttachStepTitle(step.title), stepUuid: parent ?? undefined });
      this.attachmentTargets.set(test.id, targets);
      return;
    }

    if (isHookStep) {
      if (["test.attach", "attach"].includes(step.category)) {
        const attachmentName = normalizeAttachStepTitle(step.title);
        const stack = this.#getOrCreateHookStack(test.id, isBeforeHookDescendant, step.startTime);

        let hookStepWithUuid: AttachStack | undefined;
        const parentHookStepUuid = stack.currentStep()?.uuid;
        stack.startStep(baseStep);

        stack.updateStep((stepResult) => {
          hookStepWithUuid = { ...step, uuid: stepResult.uuid as string } as AttachStack;
          stepResult.name = normalizeHookTitle(stepResult.name!);
          stepResult.stage = Stage.FINISHED;
        });
        stack.stopStep();

        const targets = this.attachmentTargets.get(test.id) ?? [];
        targets.push({
          name: attachmentName,
          hookStep: hookStepWithUuid,
          stepUuid: attachmentName === "Allure Step Metadata" ? parentHookStepUuid : undefined,
        });
        this.attachmentTargets.set(test.id, targets);
        return;
      }

      const stack = this.#getOrCreateHookStack(test.id, isBeforeHookDescendant, step.startTime);

      stack.startStep(baseStep);
      return;
    }

    if (isRootHook) {
      const stack = new ShallowStepsStack();
      stack.startStep(baseStep);
      if (isRootBeforeHook) {
        this.beforeHooksStepsStack.set(test.id, stack);
      } else {
        this.afterHooksStepsStack.set(test.id, stack);
      }
      return;
    }

    const parentUuid = step.parent ? (this.pwStepUuid.get(step.parent) ?? null) : null;
    const createdUuid = this.allureRuntime!.startStep(testUuid, parentUuid, baseStep);

    if (createdUuid) {
      this.pwStepUuid.set(step, createdUuid);
    }
  }

  onStepEnd(test: TestCase, _result: PlaywrightTestResult, step: TestStep): void {
    const isRootBeforeHook = step.title === BEFORE_HOOKS_ROOT_STEP_TITLE;
    const isRootAfterHook = step.title === AFTER_HOOKS_ROOT_STEP_TITLE;
    const isRootHook = isRootBeforeHook || isRootAfterHook;

    // For root hooks, check if we have a lazily created stack that needs to be finalized
    if (isRootHook) {
      const stack = isRootAfterHook ? this.afterHooksStepsStack.get(test.id) : this.beforeHooksStepsStack.get(test.id);

      // If stack exists (was lazily created), finalize the root hook step
      if (stack) {
        stack.updateStep((stepResult) => finalizeStepResult(stepResult, step));
        stack.stopStep({
          duration: step.duration,
        });
      }
      return;
    }

    if (this.#shouldIgnoreStep(step)) {
      return;
    }
    // ignore test.attach steps since attachments are already in the report
    if (["test.attach", "attach"].includes(step.category)) {
      return;
    }
    const testUuid = this.allureResultsUuids.get(test.id)!;
    const isBeforeHookDescendant = isBeforeHookStep(step);
    const isAfterHookDescendant = isAfterHookStep(step);
    const isAfterHook = isAfterHookDescendant;
    const isHook = isBeforeHookDescendant || isAfterHookDescendant;

    if (isHook) {
      const stack = isAfterHook ? this.afterHooksStepsStack.get(test.id) : this.beforeHooksStepsStack.get(test.id);

      // Stack might not exist if root hook was ignored (e.g., detail: false) and no test.step was called inside it
      if (!stack) {
        return;
      }

      stack.updateStep((stepResult) => finalizeStepResult(stepResult, step));
      stack.stopStep({
        duration: step.duration,
      });
      return;
    }

    const currentStep = this.allureRuntime!.currentStep(testUuid);

    if (!currentStep) {
      return;
    }

    const stepUuid = this.pwStepUuid.get(step);

    if (!stepUuid) {
      return;
    }

    this.allureRuntime!.updateStep(stepUuid, (stepResult) => finalizeStepResult(stepResult, step));
    this.allureRuntime!.stopStep(stepUuid, { duration: step.duration });
  }

  async onTestEnd(test: TestCase, result: PlaywrightTestResult) {
    const testUuid = this.allureResultsUuids.get(test.id)!;
    // We need to check parallelIndex first because pw introduced this field only in v1.30.0
    const threadId = result.parallelIndex !== undefined ? result.parallelIndex : result.workerIndex;
    const thread = `pid-${process.pid}-worker-${threadId}`;
    const error = result.error;
    // only apply default suites if not set by user
    const [, projectSuiteTitle, fileSuiteTitle, ...suiteTitles] = test.parent.titlePath();
    const beforeHooksStack = this.beforeHooksStepsStack.get(test.id);
    const afterHooksStack = this.afterHooksStepsStack.get(test.id);

    this.allureRuntime!.updateTest(testUuid, (testResult) => {
      testResult.labels.push(getHostLabel());
      testResult.labels.push(getThreadLabel(thread));

      if (projectSuiteTitle && !hasLabel(testResult, LabelName.PARENT_SUITE)) {
        testResult.labels.push({ name: LabelName.PARENT_SUITE, value: projectSuiteTitle });
      }

      if (this.options.suiteTitle && fileSuiteTitle && !hasLabel(testResult, LabelName.SUITE)) {
        testResult.labels.push({ name: LabelName.SUITE, value: fileSuiteTitle });
      }

      if (suiteTitles.length > 0 && !hasLabel(testResult, LabelName.SUB_SUITE)) {
        testResult.labels.push({ name: LabelName.SUB_SUITE, value: suiteTitles.join(" > ") });
      }

      if (error) {
        testResult.statusDetails = { ...getMessageAndTraceFromError(error) };
      } else {
        const skipReason = test.annotations?.find(
          (annotation) => annotation.type === "skip" || annotation.type === "fixme",
        )?.description;

        if (skipReason) {
          testResult.statusDetails = { ...testResult.statusDetails, message: skipReason };
        }
      }

      testResult.status = statusToAllureStats(result.status, test.expectedStatus);
      testResult.stage = Stage.FINISHED;
    });

    if (result.stdout.length > 0) {
      this.allureRuntime!.writeAttachment(
        testUuid,
        undefined,
        "stdout",
        Buffer.from(stripAnsi(result.stdout.join("")), "utf-8"),
        {
          contentType: ContentType.TEXT,
        },
      );
    }

    if (result.stderr.length > 0) {
      this.allureRuntime!.writeAttachment(
        testUuid,
        undefined,
        "stderr",
        Buffer.from(stripAnsi(result.stderr.join("")), "utf-8"),
        {
          contentType: ContentType.TEXT,
        },
      );
    }

    // FIFO
    const targets = this.attachmentTargets.get(test.id) ?? [];
    const targetsByName = new Map<string, AttachmentTarget[]>();
    for (const t of targets) {
      const q = targetsByName.get(t.name) ?? [];
      q.push(t);
      targetsByName.set(t.name, q);
    }

    const takeByName = (name: string): AttachmentTarget | undefined => {
      const target = targetsByName.get(name);
      if (!target || target.length === 0) {
        return undefined;
      }
      return target.shift();
    };

    for (const attachment of result.attachments) {
      const isRuntimeMessage = attachment.contentType === ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE;
      const stepInfo = takeByName(attachment.name);

      if (isRuntimeMessage) {
        const message = attachment.body ? (JSON.parse(attachment.body.toString()) as RuntimeMessage) : undefined;

        if (stepInfo?.hookStep) {
          const targetStack = isBeforeHookStep(stepInfo.hookStep) ? beforeHooksStack : afterHooksStack;
          this.removeStepFromHookStack(targetStack, stepInfo.hookStep.uuid);
        }

        if (message?.type === "step_metadata" && stepInfo?.stepUuid) {
          if (stepInfo.hookStep) {
            const targetStack = isBeforeHookStep(stepInfo.hookStep) ? beforeHooksStack : afterHooksStack;
            this.processHookStepMetadataMessage(targetStack, stepInfo.stepUuid, message);
          } else {
            this.processStepMetadataMessage(stepInfo.stepUuid, message);
          }
          continue;
        }

        const stepUuid = stepInfo?.hookStep?.uuid ?? stepInfo?.stepUuid;
        await this.processAttachment(testUuid, stepUuid, attachment);
        continue;
      }

      if (stepInfo?.hookStep && !this.options.flattenReport) {
        const hookStep = stepInfo.hookStep;
        const targetStack = isBeforeHookStep(hookStep) ? beforeHooksStack : afterHooksStack;

        if (targetStack) {
          const stepResult = targetStack.findStepByUuid(hookStep.uuid);
          if (stepResult) {
            const fileName = targetStack.addAttachment(attachment, this.allureRuntime!.writer);
            stepResult.attachments.push({
              name: attachment.name,
              type: attachment.contentType,
              source: fileName,
            });
          }
        }
        continue;
      }

      // flattenReport: true — remove the phantom synthetic step that was created in onStepBegin
      // so it doesn't appear as an empty step inside the hook hierarchy
      if (stepInfo?.hookStep) {
        const targetStack = isBeforeHookStep(stepInfo.hookStep) ? beforeHooksStack : afterHooksStack;
        this.removeStepFromHookStack(targetStack, stepInfo.hookStep.uuid);
      }

      if (stepInfo?.stepUuid) {
        await this.processAttachment(testUuid, stepInfo.stepUuid, attachment);
        continue;
      }

      // When flattenReport is enabled, pass null so the attachment is written directly to the
      // test root (no synthetic step wrapper). Undefined preserves the legacy behaviour of
      // wrapping in a synthetic step at the current runtime context.
      await this.processAttachment(testUuid, this.options.flattenReport ? null : undefined, attachment);
    }

    // FIXME: temp logic for labels override, we need it here to keep the reporter compatible with v2 API
    // in next iterations we need to implement the logic for every javascript integration
    this.allureRuntime!.updateTest(testUuid, (testResult) => {
      const mappedLabels = testResult.labels.reduce<Record<string, Label[]>>((acc, label) => {
        if (!acc[label.name]) {
          acc[label.name] = [];
        }

        acc[label.name].push(label);

        return acc;
      }, {});
      const newLabels = Object.keys(mappedLabels).flatMap((labelName) => {
        const labelsGroup = mappedLabels[labelName];

        if (
          labelName === LabelName.SUITE ||
          labelName === LabelName.PARENT_SUITE ||
          labelName === LabelName.SUB_SUITE
        ) {
          return labelsGroup.slice(-1);
        }

        return labelsGroup;
      });

      if (beforeHooksStack) {
        testResult.steps.unshift(...beforeHooksStack.steps);
      }
      this.beforeHooksStepsStack.delete(test.id);

      if (afterHooksStack) {
        testResult.steps.push(...afterHooksStack.steps);
      }
      this.afterHooksStepsStack.delete(test.id);

      testResult.labels = newLabels;
    });
    this.allureRuntime!.stopTest(testUuid, { duration: result.duration });
    this.allureRuntime!.writeTest(testUuid);
    this.attachmentTargets.delete(test.id);
  }

  async addSkippedResults() {
    const unprocessedCases = this.suite.allTests().filter(({ title }) => {
      const titleMetadata = extractMetadataFromString(title);

      return !this.startedTestCasesTitlesCache.includes(titleMetadata.cleanTitle);
    });

    for (const testCase of unprocessedCases) {
      this.onTestBegin(testCase);
      await this.onTestEnd(testCase, {
        status: Status.SKIPPED,
        attachments: [],
        duration: 0,
        errors: [],
        parallelIndex: 0,
        workerIndex: 0,
        retry: 0,
        steps: [],
        stderr: [],
        stdout: [],
        startTime: this.globalStartTime,
        annotations: [],
      });
    }
  }

  async onEnd() {
    await this.addSkippedResults();

    this.allureRuntime!.writeEnvironmentInfo();
    this.allureRuntime!.writeCategoriesDefinitions();
  }

  printsToStdio(): boolean {
    return false;
  }

  private removeStepFromHookStack(stack: ShallowStepsStack | undefined, stepUuid: string) {
    if (!stack) {
      return;
    }

    const removeRecursively = (steps: StepResult[]): StepResult[] => {
      return steps
        .filter((step) => step.uuid !== stepUuid)
        .map((step) => ({
          ...step,
          steps: removeRecursively(step.steps),
        }))
        .filter(
          (step) =>
            (step.name !== BEFORE_HOOKS_ROOT_STEP_TITLE && step.name !== AFTER_HOOKS_ROOT_STEP_TITLE) ||
            step.steps.length > 0 ||
            step.attachments.length > 0 ||
            step.status !== Status.PASSED,
        );
    };

    stack.steps = removeRecursively(stack.steps);
  }

  private getStaticTestMetadata(test: TestCase) {
    const titleMetadata = extractMetadataFromString(test.title);
    const project =
      test.parent.project() ??
      this.config.projects.find(
        (candidate) =>
          test.location.file === candidate.testDir || test.location.file.startsWith(`${candidate.testDir}${path.sep}`),
      ) ??
      this.config.projects[0];
    const testFilePath = path.relative(project.testDir, test.location.file);
    const relativeFileParts = testFilePath.split(path.sep);
    const relativeFile = relativeFileParts.join("/");
    const normalizedAbsoluteFile = path.normalize(test.location.file);
    const normalizedRelativeFile = path.normalize(testFilePath);
    const fileTitleCandidates = new Set([normalizedAbsoluteFile, normalizedRelativeFile, relativeFile]);
    let suiteTitles = test.parent.titlePath().filter(Boolean);

    if (project.name && suiteTitles[0] === project.name) {
      suiteTitles = suiteTitles.slice(1);
    }

    if (suiteTitles.length > 0 && fileTitleCandidates.has(path.normalize(suiteTitles[0]))) {
      suiteTitles = suiteTitles.slice(1);
    }

    const suitePrefix = suiteTitles.length > 0 ? `${suiteTitles.join(" ")} ` : "";
    const legacyFullName = `${relativeFile}#${suitePrefix}${titleMetadata.cleanTitle}`;
    let staticAllureId = titleMetadata.labels.find((label) => label.name === LabelName.ALLURE_ID)?.value;

    // Test-plan matching happens during discovery, so runtime API labels are intentionally excluded here.
    if (!staticAllureId && "annotations" in test) {
      for (const annotation of test.annotations) {
        const label = getMetadataLabel(annotation.type, annotation.description);
        if (label?.name === LabelName.ALLURE_ID) {
          staticAllureId = label.value;
          break;
        }
      }
    }

    return {
      project,
      testFilePath,
      relativeFileParts,
      suiteTitles,
      testCaseIdBase: `${relativeFile}#${suitePrefix}${test.title}`,
      titleMetadata,
      fullName: `${relativeFile}:${test.location.line}:${test.location.column}`,
      legacyFullName,
      staticAllureId,
    };
  }

  private isInTestPlan(test: TestCase) {
    if (!this.testPlan) {
      return true;
    }

    const { fullName, legacyFullName, staticAllureId } = this.getStaticTestMetadata(test);

    return (
      includedInTestPlan(this.testPlan, { fullName, id: staticAllureId }) ||
      includedInTestPlan(this.testPlan, { fullName: legacyFullName, id: staticAllureId })
    );
  }

  private processStepMetadataMessage(attachmentStepUuid: string, message: RuntimeStepMetadataMessage) {
    const { name, parameters = [] } = message.data;

    this.allureRuntime!.updateStep(attachmentStepUuid, (step) => {
      if (name) {
        step.name = name;
      }

      step.parameters.push(...parameters);
    });
  }

  private processHookStepMetadataMessage(
    stack: ShallowStepsStack | undefined,
    attachmentStepUuid: string,
    message: RuntimeStepMetadataMessage,
  ) {
    const step = stack?.findStepByUuid(attachmentStepUuid);

    if (!step) {
      return;
    }

    const { name, parameters = [] } = message.data;

    if (name) {
      step.name = name;
    }

    step.parameters.push(...parameters);
  }

  private startAndStopAttachmentStep(testUuid: string, attachmentStepUuid: string | undefined, name: string) {
    const parentUuid = this.allureRuntime!.startStep(testUuid, attachmentStepUuid, { name });
    // only stop if step is created. Step may not be created only if test with specified uuid doesn't exist.
    // usually, missing test by uuid means we should completely skip result processing;
    // the later operations are safe and will only produce console warnings
    if (parentUuid) {
      this.allureRuntime!.stopStep(parentUuid, undefined);
    }
    return parentUuid;
  }

  private async processAttachment(
    testUuid: string,
    // null  → write directly to the test root (no synthetic step wrapper)
    // undefined → wrap in a synthetic step at the current context (legacy behaviour)
    // string → write inside the specified step
    attachmentStepUuid: string | null | undefined,
    attachment: {
      name: string;
      contentType: string;
      path?: string;
      body?: Buffer;
    },
  ) {
    if (!attachment.body && !attachment.path) {
      return;
    }

    const allureRuntimeMessage = attachment.contentType === ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE;

    if (allureRuntimeMessage && !attachment.body) {
      return;
    }

    if (allureRuntimeMessage) {
      const message = JSON.parse(attachment.body!.toString()) as RuntimeMessage;
      this.allureRuntime!.applyRuntimeMessages(testUuid, [message]);
      return;
    }

    // null → attach directly to test root (no synthetic step); undefined/string → wrap in a step
    const parentUuid =
      attachmentStepUuid === null ? null : this.startAndStopAttachmentStep(testUuid, attachmentStepUuid, attachment.name);

    if (attachment.body) {
      this.allureRuntime!.writeAttachment(testUuid, parentUuid, attachment.name, attachment.body, {
        contentType: attachment.contentType,
      });
    } else if (!existsSync(attachment.path!)) {
      return;
    } else {
      const contentType =
        attachment.name === "trace" && attachment.contentType === ContentType.ZIP
          ? ContentType.PLAYWRIGHT_TRACE
          : attachment.contentType;

      this.allureRuntime!.writeAttachment(testUuid, parentUuid, attachment.name, attachment.path!, {
        contentType,
      });
    }

    if (!attachment.name.match(diffEndRegexp)) {
      return;
    }

    const pathWithoutEndFromSnapshotDir = attachment
      .path!.replace(this.outputDir!, this.snapshotDir!)
      ?.replace(diffEndRegexp, "")
      .replace(/\.png/, "");

    const pathWithoutEnd = attachment.path!.replace(diffEndRegexp, "").replace(/\.png/, "");

    if (this.processedDiffs.includes(pathWithoutEnd) || this.processedDiffs.includes(pathWithoutEndFromSnapshotDir)) {
      return;
    }
    const fileExists = async (filePath: string) => {
      return await access(filePath)
        .then(() => true)
        .catch(() => false);
    };

    const readImageFromDirs = async (modifier: "actual" | "expected" | "diff") => {
      const defaultPath = `${pathWithoutEnd}-${modifier}.png`;
      const snapshotPath = `${pathWithoutEndFromSnapshotDir}-${modifier}.png`;
      if (await fileExists(defaultPath)) {
        return await readImageAsBase64(defaultPath);
      }
      if (await fileExists(snapshotPath)) {
        return await readImageAsBase64(snapshotPath);
      }
      return undefined;
    };

    const actualBase64 = await readImageFromDirs("actual");
    const expectedBase64 = await readImageFromDirs("expected");
    const diffBase64 = await readImageFromDirs("diff");

    const diffName = attachment.name.replace(diffEndRegexp, "");

    this.allureRuntime!.writeAttachment(
      testUuid,
      undefined,
      diffName,
      Buffer.from(
        JSON.stringify({
          expected: expectedBase64,
          actual: actualBase64,
          diff: diffBase64,
          name: diffName,
        } as ImageDiffAttachment),
        "utf-8",
      ),
      {
        contentType: ContentType.IMAGEDIFF,
        fileExtension: ".imagediff",
      },
    );

    this.processedDiffs.push(pathWithoutEnd);
  }

  version(): "v2" {
    return "v2";
  }
}

/**
 * @deprecated for removal, import functions directly from "allure-js-commons".
 */
export const allure = allurePlaywrightLegacyApi;

/**
 * @deprecated for removal, import functions directly from "@playwright/test".
 */
export { test, expect } from "@playwright/test";

export default AllureReporter;
