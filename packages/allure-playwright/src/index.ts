import type { FullConfig } from "@playwright/test";
import type {
  FullResult,
  TestResult as PlaywrightTestResult,
  Suite,
  TestCase,
  TestError,
  TestStep,
} from "@playwright/test/reporter";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
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
import { randomUuid } from "allure-js-commons/sdk/reporter";
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
  getLanguageLabel,
  getPackageLabel,
  getThreadLabel,
  getWorstTestStepResult,
  md5,
  parseTestPlan,
  readImageAsBase64,
} from "allure-js-commons/sdk/reporter";
import { allurePlaywrightLegacyApi } from "./legacy.js";
import type { AllurePlaywrightReporterConfig } from "./model.js";
import {
  AFTER_HOOKS_ROOT_STEP_TITLE,
  BEFORE_HOOKS_ROOT_STEP_TITLE,
  isAfterHookStep,
  isBeforeHookStep,
  isDescendantOfStepWithTitle,
  statusToAllureStats,
} from "./utils.js";

// TODO: move to utils.ts
const diffEndRegexp = /-((expected)|(diff)|(actual))\.png$/;

interface ReporterV2 {
  onConfigure(config: FullConfig): void;

  onBegin(suite: Suite): void;

  onTestBegin(test: TestCase, result: PlaywrightTestResult): void;

  onStdOut(chunk: string | Buffer, test?: TestCase, result?: PlaywrightTestResult): void;

  onStdErr(chunk: string | Buffer, test?: TestCase, result?: PlaywrightTestResult): void;

  onTestEnd(test: TestCase, result: PlaywrightTestResult): void;

  onEnd(result: FullResult): Promise<{ status?: FullResult["status"] } | undefined | void> | void;

  onExit(): void | Promise<void>;

  onError(error: TestError): void;

  onStepBegin(test: TestCase, result: PlaywrightTestResult, step: TestStep): void;

  onStepEnd(test: TestCase, result: PlaywrightTestResult, step: TestStep): void;

  printsToStdio(): boolean;

  version(): "v2";
}
export interface AttachStack extends TestStep {
  uuid: string;
}

const normalizeHookTitle = (title: string) => {
  return title.startsWith('attach "') && title.endsWith('"') ? title.slice(8, -1) : title;
};

export class AllureReporter implements ReporterV2 {
  config!: FullConfig;
  suite!: Suite;
  options: AllurePlaywrightReporterConfig;

  private allureRuntime: ReporterRuntime | undefined;
  private globalStartTime = new Date();
  private processedDiffs: string[] = [];
  private readonly startedTestCasesTitlesCache: string[] = [];
  private readonly allureResultsUuids: Map<string, string> = new Map();
  private readonly attachmentSteps: Map<string, (string | undefined)[]> = new Map();
  private beforeHooksStepsStack: Map<string, ShallowStepsStack> = new Map();
  private afterHooksStepsStack: Map<string, ShallowStepsStack> = new Map();
  private beforeHooksAttachmentsStack: Map<string, AttachStack[]> = new Map();
  private afterHooksAttachmentsStack: Map<string, AttachStack[]> = new Map();

  constructor(config: AllurePlaywrightReporterConfig) {
    this.options = { suiteTitle: true, detail: true, ...config };
  }

  onConfigure(config: FullConfig): void {
    this.config = config;

    const testPlan = parseTestPlan();

    if (!testPlan) {
      return;
    }

    // @ts-ignore
    const configElement = config[Object.getOwnPropertySymbols(config)[0]];

    if (!configElement) {
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
    const suite = test.parent;
    const titleMetadata = extractMetadataFromString(test.title);
    const project = suite.project()!;
    const testFilePath = path.relative(project?.testDir, test.location.file);
    const relativeFile = testFilePath.split(path.sep).join("/");
    // root > project > file path > test.describe...
    const [, , , ...suiteTitles] = suite.titlePath();
    const nameSuites = suiteTitles.length > 0 ? `${suiteTitles.join(" ")} ` : "";
    const testCaseIdBase = `${relativeFile}#${nameSuites}${test.title}`;
    const result: Partial<TestResult> = {
      name: titleMetadata.cleanTitle,
      labels: [...titleMetadata.labels, ...getEnvironmentLabels()],
      links: [...titleMetadata.links],
      parameters: [],
      steps: [],
      testCaseId: md5(testCaseIdBase),
      fullName: `${relativeFile}:${test.location.line}:${test.location.column}`,
    };

    result.labels!.push(getLanguageLabel());
    result.labels!.push(getFrameworkLabel("playwright"));
    result.labels!.push(getPackageLabel(testFilePath));
    result.labels!.push({ name: "titlePath", value: suite.titlePath().join(" > ") });

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

    if (project?.name) {
      result.parameters!.push({ name: "Project", value: project.name });
    }

    if (project?.repeatEach > 1) {
      result.parameters!.push({ name: "Repetition", value: `${test.repeatEachIndex + 1}` });
    }

    const testUuid = this.allureRuntime!.startTest(result);

    this.allureResultsUuids.set(test.id, testUuid);
    this.startedTestCasesTitlesCache.push(titleMetadata.cleanTitle);
  }

  #shouldIgnoreStep(step: TestStep) {
    if (!this.options.detail && step.category !== "test.step") {
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

  onStepBegin(test: TestCase, _result: PlaywrightTestResult, step: TestStep): void {
    const isRootBeforeHook = step.title === BEFORE_HOOKS_ROOT_STEP_TITLE;
    const isRootAfterHook = step.title === AFTER_HOOKS_ROOT_STEP_TITLE;
    const isRootHook = isRootBeforeHook || isRootAfterHook;
    const isBeforeHookDescendant = isBeforeHookStep(step);
    const isAfterHookDescendant = isAfterHookStep(step);
    const isHookStep = isBeforeHookDescendant || isAfterHookDescendant;

    const testUuid = this.allureResultsUuids.get(test.id)!;

    if (step.category === "attach" && !isHookStep) {
      const currentStep = this.allureRuntime?.currentStep(testUuid);
      this.attachmentSteps.set(testUuid, [...(this.attachmentSteps.get(testUuid) ?? []), currentStep]);
      return;
    }

    if (this.#shouldIgnoreStep(step)) {
      return;
    }

    const baseStep: StepResult = {
      ...createStepResult(),
      name: normalizeHookTitle(step.title),
      start: step.startTime.getTime(),
      stage: Stage.RUNNING,
      uuid: randomUuid(),
    };

    if (isHookStep) {
      const stack = isBeforeHookDescendant
        ? this.beforeHooksStepsStack.get(test.id)!
        : this.afterHooksStepsStack.get(test.id)!;

      if (step.category === "attach") {
        stack.startStep(baseStep);
        const attachStack = isBeforeHookDescendant ? this.beforeHooksAttachmentsStack : this.afterHooksAttachmentsStack;
        stack.updateStep((stepResult) => {
          stepResult.stage = Stage.FINISHED;
          attachStack.set(test.id, [...(attachStack.get(test.id) ?? []), { ...step, uuid: stepResult.uuid as string }]);
        });
        stack.stopStep();
        return;
      }
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

    this.allureRuntime!.startStep(testUuid, undefined, baseStep)!;
  }

  onStepEnd(test: TestCase, _result: PlaywrightTestResult, step: TestStep): void {
    if (this.#shouldIgnoreStep(step)) {
      return;
    }

    // ignore attach steps since attachments are already in the report
    if (step.category === "attach") {
      return;
    }

    const testUuid = this.allureResultsUuids.get(test.id)!;
    const isRootBeforeHook = step.title === BEFORE_HOOKS_ROOT_STEP_TITLE;
    const isRootAfterHook = step.title === AFTER_HOOKS_ROOT_STEP_TITLE;
    const isBeforeHookDescendant = isBeforeHookStep(step);
    const isAfterHookDescendant = isAfterHookStep(step);
    const isAfterHook = isRootAfterHook || isAfterHookDescendant;
    const isHook = isRootBeforeHook || isRootAfterHook || isBeforeHookDescendant || isAfterHookDescendant;

    if (isHook) {
      const stack = isAfterHook ? this.afterHooksStepsStack.get(test.id)! : this.beforeHooksStepsStack.get(test.id)!;

      stack.updateStep((stepResult) => {
        const { status = Status.PASSED } = getWorstTestStepResult(stepResult.steps) ?? {};

        stepResult.status = step.error ? Status.FAILED : status;
        stepResult.stage = Stage.FINISHED;
        stepResult.name = `${stepResult.name ?? ""}`;

        if (step.error) {
          stepResult.statusDetails = { ...getMessageAndTraceFromError(step.error) };
        }
      });
      stack.stopStep({
        duration: step.duration,
      });
      return;
    }

    const currentStep = this.allureRuntime!.currentStep(testUuid);

    if (!currentStep) {
      return;
    }

    this.allureRuntime!.updateStep(currentStep, (stepResult) => {
      const { status = Status.PASSED } = getWorstTestStepResult(stepResult.steps) ?? {};

      stepResult.status = step.error ? Status.FAILED : status;
      stepResult.stage = Stage.FINISHED;
      if (step.error) {
        stepResult.statusDetails = { ...getMessageAndTraceFromError(step.error) };
      }
    });
    this.allureRuntime!.stopStep(currentStep, { duration: step.duration });
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

    const attachmentsInBeforeHooks = this.beforeHooksAttachmentsStack.get(test.id) ?? [];
    const attachmentsInAfterHooks = this.afterHooksAttachmentsStack.get(test.id) ?? [];

    const hookAttachmentUuids = new Set(
      [...attachmentsInBeforeHooks, ...attachmentsInAfterHooks]
        .map((hookStep) => normalizeHookTitle(hookStep.title))
        .filter(Boolean),
    );
    const attachmentSteps = this.attachmentSteps.get(testUuid) ?? [];
    const attachmentsInSteps = result.attachments.filter((attachment) => !hookAttachmentUuids.has(attachment.name));

    for (let i = 0; i < attachmentsInSteps.length; i++) {
      const attachment = attachmentsInSteps[i];
      const attachmentStep = attachmentSteps.length > i ? attachmentSteps[i] : undefined;
      await this.processAttachment(testUuid, attachmentStep, attachment);
    }

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

    // FIXME: temp logic for labels override, we need it here to keep the reporter compatible with v2 API
    // in next iterations we need to implement the logic for every javascript integration

    const hookAttachmentNames = new Set(
      [...attachmentsInBeforeHooks, ...attachmentsInAfterHooks]
        .map((hookStep) => normalizeHookTitle(hookStep.title))
        .filter(Boolean),
    );
    const onlyHooksAttachments = result.attachments.filter((att) => hookAttachmentNames.has(att.name));

    for (const attachment of onlyHooksAttachments) {
      const matchingBeforeHookStep = attachmentsInBeforeHooks.find(
        (step) => normalizeHookTitle(step.title) === attachment.name,
      );
      const matchingAfterHookStep = attachmentsInAfterHooks.find(
        (step) => normalizeHookTitle(step.title) === attachment.name,
      );
      const targetStack = matchingBeforeHookStep ? beforeHooksStack : afterHooksStack;
      const hookStep = matchingBeforeHookStep || matchingAfterHookStep;

      if (targetStack && hookStep) {
        const stepResult = targetStack?.findStepByUuid(hookStep?.uuid);
        if (stepResult) {
          const fileName = targetStack.addAttachment(attachment, this.allureRuntime!.writer);
          stepResult.attachments.push({
            name: attachment.name,
            type: attachment.contentType,
            source: fileName,
          });
        }
      }
    }
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
        this.beforeHooksStepsStack.delete(test.id);
      }

      if (afterHooksStack) {
        testResult.steps.push(...afterHooksStack.steps);
        this.afterHooksStepsStack.delete(test.id);
      }

      testResult.labels = newLabels;
    });

    this.allureRuntime!.stopTest(testUuid, { duration: result.duration });
    this.allureRuntime!.writeTest(testUuid);
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

  private processStepMetadataMessage(attachmentStepUuid: string, message: RuntimeStepMetadataMessage) {
    const { name, parameters = [] } = message.data;

    this.allureRuntime!.updateStep(attachmentStepUuid, (step) => {
      if (name) {
        step.name = name;
      }

      step.parameters.push(...parameters);
    });
  }

  private async processAttachment(
    testUuid: string,
    attachmentStepUuid: string | undefined,
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

      if (message.type === "step_metadata") {
        this.processStepMetadataMessage(attachmentStepUuid!, message);
        return;
      }

      this.allureRuntime!.applyRuntimeMessages(testUuid, [message]);
      return;
    }

    const parentUuid = this.allureRuntime!.startStep(testUuid, attachmentStepUuid, { name: attachment.name });

    // only stop if step is created. Step may not be created only if test with specified uuid doesn't exists.
    // usually, missing test by uuid means we should completely skip result processing;
    // the later operations are safe and will only produce console warnings
    if (parentUuid) {
      this.allureRuntime!.stopStep(parentUuid, undefined);
    }

    if (attachment.body) {
      this.allureRuntime!.writeAttachment(testUuid, parentUuid, attachment.name, attachment.body, {
        contentType: attachment.contentType,
      });
    } else if (!existsSync(attachment.path!)) {
      return;
    } else {
      const contentType =
        attachment.name === "trace" && attachment.contentType === "application/zip"
          ? "application/vnd.allure.playwright-trace"
          : attachment.contentType;

      this.allureRuntime!.writeAttachment(testUuid, parentUuid, attachment.name, attachment.path!, {
        contentType,
      });
    }

    if (!attachment.name.match(diffEndRegexp)) {
      return;
    }

    const pathWithoutEnd = attachment.path!.replace(diffEndRegexp, "");

    if (this.processedDiffs.includes(pathWithoutEnd)) {
      return;
    }

    const actualBase64 = await readImageAsBase64(`${pathWithoutEnd}-actual.png`);
    const expectedBase64 = await readImageAsBase64(`${pathWithoutEnd}-expected.png`);
    const diffBase64 = await readImageAsBase64(`${pathWithoutEnd}-diff.png`);
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
