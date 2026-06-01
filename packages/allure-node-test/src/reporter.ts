import { readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import {
  ContentType,
  LabelName,
  Stage,
  Status,
  type FixtureResult,
  type StatusDetails,
  type TestResult,
} from "allure-js-commons";
import {
  extractMetadataFromString,
  getMessageAndTraceFromError,
  getStatusFromError,
  type RuntimeMessage,
} from "allure-js-commons/sdk";
import {
  FileSystemWriter,
  ReporterRuntime,
  formatLinks,
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getPackageLabel,
  getSuiteLabels,
  getThreadLabel,
  randomUuid,
  type Writer,
} from "allure-js-commons/sdk/reporter";

import { getNodeTestReporterConfig } from "./config.js";
import type {
  NodeTestEvent,
  NodeTestEventData,
  NodeTestError,
  NodeTestReporterConfig,
  NodeTestResultEvent,
  RuntimeMessageRecord,
  StatusResolution,
  TestMetadata,
} from "./model.js";
import {
  ensureRunDir,
  getAllureFullNameFromParts,
  getFallbackNodeFullName,
  getRelativeFilePath,
  normalizeFilePath,
} from "./utils.js";

const getEventType = (data: NodeTestEventData) => data.details?.type ?? data.type;

const isTestResultEvent = (
  event: NodeTestEvent,
): event is NodeTestEvent & { data: NodeTestEventData; type: "test:fail" | "test:pass" } =>
  (event.type === "test:pass" || event.type === "test:fail") && !!event.data;

const isSyntheticFileEvent = (data: NodeTestEventData) => {
  const file = normalizeFilePath(data.file);
  const name = normalizeFilePath(data.name);

  return data.nesting === 0 && !!file && file === name;
};

const makeUserSuiteLabelsOverrideGenerated = (allureResult: TestResult) => {
  const suiteLabelNames = new Set<string>([LabelName.PARENT_SUITE, LabelName.SUITE, LabelName.SUB_SUITE]);
  const lastSuiteLabelIndexes = new Map<string, number>();

  allureResult.labels.forEach((label, index) => {
    if (suiteLabelNames.has(label.name)) {
      lastSuiteLabelIndexes.set(label.name, index);
    }
  });

  allureResult.labels = allureResult.labels.filter((label, index) => {
    if (!suiteLabelNames.has(label.name)) {
      return true;
    }

    return lastSuiteLabelIndexes.get(label.name) === index;
  });
};

const getTestKey = (data: Pick<NodeTestEventData, "file" | "testId">) => {
  const file = normalizeFilePath(data.file);

  return file && data.testId !== undefined ? `${file}#${data.testId}` : undefined;
};

const toTextAttachmentMessage = (name: string, content: string): RuntimeMessage => ({
  type: "global_attachment_content",
  data: {
    name,
    content: Buffer.from(content).toString("base64"),
    encoding: "base64",
    contentType: ContentType.TEXT,
    fileExtension: "txt",
  },
});

const isGlobalRuntimeMessage = (message: RuntimeMessage) =>
  message.type === "global_attachment_content" ||
  message.type === "global_attachment_path" ||
  message.type === "global_error";

const hasTestPlanSkipLabel = (result: TestResult) => result.labels.some(({ name }) => name === "ALLURE_TESTPLAN_SKIP");

const reporterRunDir = ensureRunDir();

type HookFailureType = "before" | "beforeEach" | "afterEach" | "after";
type HookFixtureType = "before" | "after";
type HookFailureScope = "suite" | "test";

type HookFailureRecord = {
  readonly data: NodeTestEventData;
  readonly details: StatusDetails;
  readonly fixtureType: HookFixtureType;
  readonly hookType: HookFailureType;
  readonly message: string;
  readonly receivedAt: number;
  readonly scope: HookFailureScope;
  readonly status: Status;
  readonly suitePath: string[];
};

type WrittenTestRecord = {
  readonly data: NodeTestEventData;
  readonly metadata: TestMetadata;
  readonly uuid: string;
};

export class AllureNodeTestReporter {
  readonly #allureRuntime: ReporterRuntime;
  readonly #runDir: string;
  readonly #writer: Writer;
  readonly #stacksByFile = new Map<string, NodeTestEventData[]>();
  readonly #resultEvents: NodeTestResultEvent[] = [];
  readonly #stdoutByTest = new Map<string, string[]>();
  readonly #stderrByTest = new Map<string, string[]>();
  readonly #diagnosticsByTest = new Map<string, string[]>();
  readonly #globalStdout: string[] = [];
  readonly #globalStderr: string[] = [];
  readonly #globalDiagnostics: string[] = [];
  readonly #hookFailures: HookFailureRecord[] = [];
  readonly #writtenTests: WrittenTestRecord[] = [];
  #finished = false;

  constructor(config: NodeTestReporterConfig = {}) {
    const { listeners, resultsDir, writer, runDir, ...runtimeConfig } = config;

    this.#runDir = ensureRunDir(runDir ?? reporterRunDir);
    this.#writer = writer ?? new FileSystemWriter({ resultsDir: resultsDir || "./allure-results" });
    this.#allureRuntime = new ReporterRuntime({
      ...runtimeConfig,
      listeners,
      writer: this.#writer,
    });
  }

  handleEvent = (event: NodeTestEvent) => {
    if (!event.data) {
      return;
    }

    switch (event.type) {
      case "test:start":
      case "test:enqueue":
      case "test:dequeue":
        this.#rememberStartedEvent(event.data);
        return;
      case "test:pass":
      case "test:fail":
        if (isTestResultEvent(event)) {
          this.#rememberResultEvent(event);
        }
        return;
      case "test:stdout":
        this.#rememberOutput(event.data, this.#stdoutByTest, this.#globalStdout);
        return;
      case "test:stderr":
        this.#rememberOutput(event.data, this.#stderrByTest, this.#globalStderr);
        return;
      case "test:diagnostic":
        this.#rememberOutput(event.data, this.#diagnosticsByTest, this.#globalDiagnostics);
        return;
      case "test:interrupted":
        this.#rememberInterruptedTests(event.data);
        return;
      default:
        return;
    }
  };

  finish = () => {
    if (this.#finished) {
      return;
    }

    this.#finished = true;

    const runtimeRecords = readRuntimeMessageRecords(this.#runDir);
    const matchedRecordIndexes = new Set<number>();

    this.#allureRuntime.writeCategoriesDefinitions();
    this.#allureRuntime.writeEnvironmentInfo();

    for (const resultEvent of this.#resultEvents) {
      this.#writeTestResult(resultEvent, runtimeRecords, matchedRecordIndexes);
    }

    this.#writeHookFailureContainers();
    this.#writeGlobalMessages(runtimeRecords, matchedRecordIndexes);
    this.#cleanupRunDir();
  };

  get writer() {
    return this.#writer;
  }

  #rememberStartedEvent = (data: NodeTestEventData) => {
    const file = normalizeFilePath(data.file);

    if (!file || data.nesting === undefined || isSyntheticFileEvent(data)) {
      return;
    }

    const stack = this.#stacksByFile.get(file) ?? [];

    stack[data.nesting] = {
      ...data,
      file,
    };
    stack.length = data.nesting + 1;
    this.#stacksByFile.set(file, stack);
  };

  #rememberResultEvent = (event: NodeTestEvent & { data: NodeTestEventData; type: "test:fail" | "test:pass" }) => {
    const type = getEventType(event.data);
    const receivedAt = Date.now();
    const hookFailure = this.#getHookFailureRecord(event.data, receivedAt);

    if (hookFailure) {
      this.#hookFailures.push(hookFailure);
    }

    if (type === "suite" || isSyntheticFileEvent(event.data)) {
      return;
    }

    this.#resultEvents.push({
      data: {
        ...event.data,
        file: normalizeFilePath(event.data.file),
      },
      eventType: event.type,
      receivedAt,
      suitePath: this.#getSuitePath(event.data),
    });
  };

  #rememberInterruptedTests = (data: NodeTestEventData) => {
    for (const test of data.tests ?? []) {
      if (getEventType(test) === "suite" || isSyntheticFileEvent(test)) {
        continue;
      }

      this.#resultEvents.push({
        data: {
          ...test,
          details: {
            ...test.details,
            error:
              test.details?.error ??
              ({
                message: "Test was interrupted",
                name: "InterruptedError",
              } satisfies NodeTestError),
          },
          file: normalizeFilePath(test.file),
        },
        eventType: "test:fail",
        receivedAt: Date.now(),
        suitePath: this.#getSuitePath(test),
      });
    }
  };

  #rememberOutput = (data: NodeTestEventData, outputByTest: Map<string, string[]>, globalOutput: string[]) => {
    const message = data.message ?? "";
    const key = getTestKey(data);

    if (!key) {
      globalOutput.push(message);
      return;
    }

    const chunks = outputByTest.get(key) ?? [];

    chunks.push(message);
    outputByTest.set(key, chunks);
  };

  #writeTestResult = (
    resultEvent: NodeTestResultEvent,
    runtimeRecords: readonly RuntimeMessageRecord[],
    matchedRecordIndexes: Set<number>,
  ) => {
    const metadata = this.#getTestMetadata(resultEvent.data, resultEvent.suitePath);
    const statusResolution = resolveStatus(resultEvent);
    const duration = resultEvent.data.details?.duration_ms ?? 0;
    const testUuid = this.#allureRuntime.startTest({
      name: metadata.cleanName,
      fullName: metadata.fullName,
      start: resultEvent.receivedAt - duration,
      stage: Stage.RUNNING,
      labels: [
        getLanguageLabel(),
        getFrameworkLabel("node:test"),
        getHostLabel(),
        getThreadLabel(getThreadName(resultEvent.data)),
        ...getEnvironmentLabels(),
        ...(resultEvent.data.file ? [getPackageLabel(resultEvent.data.file)] : []),
        ...getSuiteLabels(metadata.suitePath),
        ...metadata.labels,
        ...(resultEvent.data.tags ?? []).map((value) => ({ name: LabelName.TAG, value })),
      ],
      links: this.#allureRuntime.linkConfig
        ? formatLinks(this.#allureRuntime.linkConfig, metadata.links)
        : metadata.links,
      titlePath: metadata.titlePath,
    });

    for (const [index, record] of runtimeRecords.entries()) {
      if (matchedRecordIndexes.has(index) || !matchesRuntimeRecord(record, resultEvent.data, metadata)) {
        continue;
      }

      matchedRecordIndexes.add(index);
      this.#allureRuntime.applyRuntimeMessages(testUuid, [record.message]);
    }

    this.#writeOutputAttachment(testUuid, "stdout", this.#stdoutByTest.get(getTestKey(resultEvent.data) ?? "") ?? []);
    this.#writeOutputAttachment(testUuid, "stderr", this.#stderrByTest.get(getTestKey(resultEvent.data) ?? "") ?? []);
    this.#writeOutputAttachment(
      testUuid,
      "diagnostics",
      this.#diagnosticsByTest.get(getTestKey(resultEvent.data) ?? "") ?? [],
    );

    let includedInTestPlan = true;

    this.#allureRuntime.updateTest(testUuid, (result) => {
      includedInTestPlan = !hasTestPlanSkipLabel(result);

      if (!includedInTestPlan) {
        return;
      }

      const hookAwareStatusResolution = this.#resolveHookAwareStatus(resultEvent, metadata, statusResolution);

      result.status = hookAwareStatusResolution.status;
      result.statusDetails = hookAwareStatusResolution.details;
      result.stage = hookAwareStatusResolution.stage;
      makeUserSuiteLabelsOverrideGenerated(result);
    });
    this.#allureRuntime.stopTest(testUuid, { duration });
    this.#allureRuntime.writeTest(testUuid);

    if (includedInTestPlan) {
      this.#writtenTests.push({
        data: resultEvent.data,
        metadata,
        uuid: testUuid,
      });
    }
  };

  #getTestMetadata = (data: NodeTestEventData, suitePathOverride?: readonly string[]): TestMetadata => {
    const file = normalizeFilePath(data.file);
    const suitePath = [...(suitePathOverride ?? this.#getSuitePath(data))];
    const { cleanTitle, labels, links } = extractMetadataFromString(data.name ?? "");
    const nodeFullName = getFallbackNodeFullName(suitePath, data.name);
    const fullName = getAllureFullNameFromParts(file, suitePath.concat(data.name ? [data.name] : [])) ?? nodeFullName;
    const relativeFile = getRelativeFilePath(file);
    const titlePath = relativeFile ? relativeFile.split("/") : [];

    titlePath.push(...suitePath);

    return {
      cleanName: cleanTitle || data.name || "",
      fullName,
      labels,
      links,
      nodeFullName,
      relativeFile,
      suitePath,
      titlePath,
    };
  };

  #getSuitePath = (data: NodeTestEventData) => {
    const file = normalizeFilePath(data.file);
    const nesting = data.nesting ?? 0;

    if (!file || nesting === 0) {
      return [];
    }

    const stack = this.#stacksByFile.get(file) ?? [];

    return stack
      .slice(0, nesting)
      .map((entry) => entry?.name)
      .filter((name): name is string => !!name);
  };

  #writeOutputAttachment = (testUuid: string, name: string, chunks: readonly string[]) => {
    if (!chunks.length) {
      return;
    }

    this.#allureRuntime.writeAttachment(testUuid, null, name, Buffer.from(chunks.join("")), {
      contentType: ContentType.TEXT,
      fileExtension: "txt",
    });
  };

  #getHookFailureRecord = (data: NodeTestEventData, receivedAt: number): HookFailureRecord | undefined => {
    const error = data.details?.error;
    const message = error?.message ?? "";
    const hookType = getHookFailureType(message);

    if (!hookType) {
      return;
    }

    const realError = getHookCause(error);
    const scope = hookType === "before" || hookType === "after" ? "suite" : "test";

    return {
      data: {
        ...data,
        file: normalizeFilePath(data.file),
      },
      details: getHookStatusDetails(realError),
      fixtureType: hookType === "before" || hookType === "beforeEach" ? "before" : "after",
      hookType,
      message,
      receivedAt,
      scope,
      status: getHookStatus(realError),
      suitePath:
        scope === "suite" ? this.#getSuitePath(data).concat(data.name ? [data.name] : []) : this.#getSuitePath(data),
    };
  };

  #resolveHookAwareStatus = (
    resultEvent: NodeTestResultEvent,
    metadata: TestMetadata,
    baseStatusResolution: StatusResolution,
  ): StatusResolution => {
    const directHookFailure = this.#hookFailures.find(
      (hookFailure) => hookFailure.scope === "test" && isSameNodeTest(hookFailure.data, resultEvent.data),
    );

    if (directHookFailure) {
      return {
        details: directHookFailure.details,
        stage: Stage.FINISHED,
        status: directHookFailure.status,
      };
    }

    const suiteBeforeHookFailure = this.#findRelevantSuiteHookFailure(resultEvent.data, metadata, "before");

    if (suiteBeforeHookFailure && isCancelledError(resultEvent.data.details?.error)) {
      const message = suiteBeforeHookFailure.details.message
        ? `skipped because before hook failed: ${suiteBeforeHookFailure.details.message}`
        : "skipped because before hook failed";

      return {
        details: {
          message,
          trace: suiteBeforeHookFailure.details.trace,
        },
        stage: Stage.PENDING,
        status: Status.SKIPPED,
      };
    }

    const suiteAfterHookFailure = this.#findRelevantSuiteHookFailure(resultEvent.data, metadata, "after");

    if (suiteAfterHookFailure) {
      return getWorseStatusResolution(baseStatusResolution, {
        details: suiteAfterHookFailure.details,
        stage: Stage.FINISHED,
        status: suiteAfterHookFailure.status,
      });
    }

    return baseStatusResolution;
  };

  #findRelevantSuiteHookFailure = (data: NodeTestEventData, metadata: TestMetadata, hookType: "before" | "after") => {
    return this.#hookFailures.find(
      (hookFailure) =>
        hookFailure.scope === "suite" &&
        hookFailure.hookType === hookType &&
        normalizeFilePath(hookFailure.data.file) === normalizeFilePath(data.file) &&
        isSuitePathPrefix(hookFailure.suitePath, metadata.suitePath),
    );
  };

  #writeHookFailureContainers = () => {
    for (const hookFailure of this.#hookFailures) {
      const children = this.#writtenTests
        .filter((test) => hookFailureAffectsTest(hookFailure, test))
        .map(({ uuid }) => uuid);

      if (!children.length) {
        continue;
      }

      const fixture = createHookFailureFixture(hookFailure);

      this.#writer.writeGroup({
        uuid: randomUuid(),
        name: fixture.name,
        children: [...new Set(children)],
        befores: hookFailure.fixtureType === "before" ? [fixture] : [],
        afters: hookFailure.fixtureType === "after" ? [fixture] : [],
      });
    }
  };

  #writeGlobalMessages = (runtimeRecords: readonly RuntimeMessageRecord[], matchedRecordIndexes: Set<number>) => {
    const globalMessages = runtimeRecords
      .filter((record, index) => !matchedRecordIndexes.has(index) && isGlobalRuntimeMessage(record.message))
      .map((record) => record.message);

    if (this.#globalStdout.length) {
      globalMessages.push(toTextAttachmentMessage("stdout", this.#globalStdout.join("")));
    }

    if (this.#globalStderr.length) {
      globalMessages.push(toTextAttachmentMessage("stderr", this.#globalStderr.join("")));
    }

    if (this.#globalDiagnostics.length) {
      globalMessages.push(toTextAttachmentMessage("diagnostics", this.#globalDiagnostics.join("")));
    }

    for (const hookFailure of this.#hookFailures) {
      if (this.#shouldWriteHookGlobalError(hookFailure)) {
        globalMessages.push(toGlobalErrorMessage(hookFailure));
      }
    }

    if (globalMessages.length) {
      this.#allureRuntime.applyGlobalRuntimeMessages(globalMessages);
    }
  };

  #shouldWriteHookGlobalError = (hookFailure: HookFailureRecord) => {
    if (this.#writtenTests.some((test) => hookFailureAffectsTest(hookFailure, test))) {
      return true;
    }

    return !this.#resultEvents.some((resultEvent) =>
      hookFailureAffectsTest(hookFailure, {
        data: resultEvent.data,
        metadata: this.#getTestMetadata(resultEvent.data, resultEvent.suitePath),
        uuid: "",
      }),
    );
  };

  #cleanupRunDir = () => {
    try {
      rmSync(this.#runDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup only.
    }
  };
}

export const readRuntimeMessageRecords = (runDir: string): RuntimeMessageRecord[] => {
  let files: string[];

  try {
    files = readdirSync(runDir).filter((file) => file.endsWith(".jsonl"));
  } catch {
    return [];
  }

  return files.flatMap((file) =>
    readFileSync(join(runDir, file), "utf8")
      .split(/\r?\n/g)
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as RuntimeMessageRecord];
        } catch {
          return [];
        }
      }),
  );
};

export const resolveStatus = (resultEvent: NodeTestResultEvent): StatusResolution => {
  const { data, eventType } = resultEvent;

  if (data.skip !== undefined || data.todo !== undefined) {
    return {
      status: Status.SKIPPED,
      stage: Stage.PENDING,
      details: {
        message: getSkipOrTodoMessage(data),
      },
    };
  }

  const error = data.details?.error;

  if (eventType === "test:fail" && isCancelledError(error)) {
    return {
      status: Status.SKIPPED,
      stage: Stage.PENDING,
      details: {
        message: error?.message ?? "Test was cancelled",
        trace: error?.stack,
      },
    };
  }

  if (eventType === "test:fail") {
    const cause = error?.cause ?? error;

    return {
      status: getStatusFromError(cause ?? {}),
      stage: Stage.FINISHED,
      details: cause ? getMessageAndTraceFromError(cause) : {},
    };
  }

  return {
    status: Status.PASSED,
    stage: Stage.FINISHED,
    details: {},
  };
};

const getHookFailureType = (message: string): HookFailureType | undefined => {
  switch (message) {
    case "failed running before hook":
      return "before";
    case "failed running beforeEach hook":
      return "beforeEach";
    case "failed running afterEach hook":
      return "afterEach";
    case "failed running after hook":
      return "after";
    default:
      return undefined;
  }
};

const getHookCause = (error: NodeTestError | undefined): NodeTestError | Error | string | undefined => {
  if (error?.cause && typeof error.cause === "object") {
    return error.cause;
  }

  return error;
};

const getHookStatus = (error: NodeTestError | Error | string | undefined) => {
  if (!error || typeof error === "string") {
    return Status.BROKEN;
  }

  return getStatusFromError(error);
};

const getHookStatusDetails = (error: NodeTestError | Error | string | undefined): StatusDetails => {
  if (!error) {
    return {};
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return getMessageAndTraceFromError(error);
};

const createHookFailureFixture = (hookFailure: HookFailureRecord): FixtureResult => {
  const duration = hookFailure.data.details?.duration_ms ?? 0;

  return {
    name: `${hookFailure.hookType} hook`,
    status: hookFailure.status,
    statusDetails: hookFailure.details,
    stage: Stage.FINISHED,
    steps: [],
    attachments: [],
    parameters: [],
    start: hookFailure.receivedAt - duration,
    stop: hookFailure.receivedAt,
  };
};

const toGlobalErrorMessage = (hookFailure: HookFailureRecord): RuntimeMessage => {
  const fixtureName = `${hookFailure.hookType} hook`;
  const suiteName = hookFailure.suitePath.length ? ` in ${hookFailure.suitePath.join(" > ")}` : "";
  const message = hookFailure.details.message
    ? `${fixtureName}${suiteName} failed: ${hookFailure.details.message}`
    : `${fixtureName}${suiteName} failed`;

  return {
    type: "global_error",
    data: {
      ...hookFailure.details,
      message,
    },
  };
};

const hookFailureAffectsTest = (hookFailure: HookFailureRecord, test: WrittenTestRecord) => {
  if (normalizeFilePath(hookFailure.data.file) !== normalizeFilePath(test.data.file)) {
    return false;
  }

  if (hookFailure.scope === "test") {
    return isSameNodeTest(hookFailure.data, test.data);
  }

  return isSuitePathPrefix(hookFailure.suitePath, test.metadata.suitePath);
};

const isSameNodeTest = (left: NodeTestEventData, right: NodeTestEventData) => {
  if (normalizeFilePath(left.file) !== normalizeFilePath(right.file)) {
    return false;
  }

  if (left.testId !== undefined && right.testId !== undefined) {
    return left.testId === right.testId;
  }

  return (
    left.name === right.name &&
    left.nesting === right.nesting &&
    left.testNumber === right.testNumber &&
    left.line === right.line &&
    left.column === right.column
  );
};

const isSuitePathPrefix = (suitePath: readonly string[], testSuitePath: readonly string[]) => {
  if (suitePath.length > testSuitePath.length) {
    return false;
  }

  return suitePath.every((suiteName, index) => suiteName === testSuitePath[index]);
};

const getWorseStatusResolution = (left: StatusResolution, right: StatusResolution): StatusResolution => {
  return getStatusPriority(right.status) < getStatusPriority(left.status) ? right : left;
};

const getStatusPriority = (status: Status) => {
  switch (status) {
    case Status.FAILED:
      return 0;
    case Status.BROKEN:
      return 1;
    case Status.PASSED:
      return 2;
    case Status.SKIPPED:
      return 3;
    default:
      return 4;
  }
};

const getSkipOrTodoMessage = (data: NodeTestEventData) => {
  if (typeof data.skip === "string") {
    return data.skip;
  }

  if (typeof data.todo === "string") {
    return data.todo;
  }

  if (data.todo !== undefined) {
    return "TODO";
  }

  return "SKIPPED";
};

const isCancelledError = (error: NodeTestError | undefined) => {
  const failureType = error?.failureType;
  const message = error?.message;
  const cause = typeof error?.cause === "string" ? error.cause : error?.cause?.message;

  return (
    (typeof failureType === "string" && /cancel/i.test(failureType)) ||
    (typeof message === "string" && /cancel/i.test(message)) ||
    (typeof cause === "string" && /cancel/i.test(cause))
  );
};

const getThreadName = (data: NodeTestEventData) => {
  const workerId = process.env.NODE_TEST_WORKER_ID;

  if (workerId) {
    return `node-test-worker-${workerId}`;
  }

  return data.testId === undefined ? `node-test-${process.pid}` : `node-test-${process.pid}-${data.testId}`;
};

const matchesRuntimeRecord = (record: RuntimeMessageRecord, data: NodeTestEventData, metadata: TestMetadata) => {
  if (record.testId !== undefined && data.testId !== undefined) {
    return record.testId === data.testId && normalizeFilePath(record.file) === normalizeFilePath(data.file);
  }

  if (record.allureFullName && record.allureFullName === metadata.fullName) {
    return true;
  }

  return (
    normalizeFilePath(record.file) === normalizeFilePath(data.file) &&
    !!record.nodeFullName &&
    record.nodeFullName === metadata.nodeFullName
  );
};

export default async function* allureNodeTestReporter(source: AsyncIterable<NodeTestEvent>) {
  const reporter = new AllureNodeTestReporter(getNodeTestReporterConfig());

  yield* [];

  try {
    for await (const event of source) {
      reporter.handleEvent(event);
    }
  } finally {
    reporter.finish();
  }
}
