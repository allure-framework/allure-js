import { Stage, Status } from "allure-js-commons";
import type { Link } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import type { FixtureType, ReporterConfig } from "allure-js-commons/sdk/reporter";
import {
  ReporterRuntime,
  createDefaultWriter,
  getEnvironmentLabels,
  getFallbackTestCaseIdLabel,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getPackageLabel,
  getPosixPath,
  getRelativePath,
  getThreadLabel,
  formatLinks,
  md5,
} from "allure-js-commons/sdk/reporter";

import type {
  AllureAvaGlobalRuntimeMessageEvent,
  AllureAvaRuntimeMessageEvent,
  AvaSerializedError,
  AvaStateChangeEvent,
  NormalizedStatusDetails,
} from "./types.js";

type TestState = {
  file: string;
  key: string;
  scopeUuid: string;
  stopped: boolean;
  title: string;
  uuid: string;
  written: boolean;
};

type StartTestResult = Parameters<ReporterRuntime["startTest"]>[0] & {
  testCaseName?: string;
};

const isRuntimeMessageEvent = (
  event: AvaStateChangeEvent,
): event is AvaStateChangeEvent & AllureAvaRuntimeMessageEvent => event.type === "allure-runtime-message";

const isGlobalRuntimeMessageEvent = (
  event: AvaStateChangeEvent,
): event is AvaStateChangeEvent & AllureAvaGlobalRuntimeMessageEvent => event.type === "allure-global-runtime-message";

const getEventFile = (event: Pick<AvaStateChangeEvent, "testFile">) => event.testFile ?? "";

const getTestKey = (testFile: string, title: string) => `${testFile}\u0000${title}`;

const normalizeTitlePath = (testFile: string) => getPosixPath(getRelativePath(testFile)).split("/").filter(Boolean);

const getFullName = (testFile: string, title: string) => `${getPosixPath(getRelativePath(testFile))}#${title}`;

const getStatusDetails = (err?: AvaSerializedError): NormalizedStatusDetails => {
  if (!err) {
    return {
      message: "Unknown AVA error",
    };
  }

  if (err.type === "aggregate" && err.errors?.length) {
    return getStatusDetails(err.errors[0]);
  }

  return {
    message: err.message ?? err.name ?? "Unknown AVA error",
    trace: err.stack,
  };
};

const getStatusFromSerializedError = (err?: AvaSerializedError) => {
  if (!err) {
    return Status.BROKEN;
  }

  if (err.type === "ava") {
    return err.assertion || err.message === "Assertion failed" ? Status.FAILED : Status.BROKEN;
  }

  if (err.name === "AssertionError" || err.assertion) {
    return Status.FAILED;
  }

  return Status.BROKEN;
};

const getFixtureType = (title: string): FixtureType => (title.startsWith("after") ? "after" : "before");

const getHookTargetTitle = (title: string) => {
  const marker = " for ";
  const markerIndex = title.lastIndexOf(marker);

  return markerIndex === -1 ? undefined : title.slice(markerIndex + marker.length);
};

export class AllureAvaReporter {
  readonly #linkConfig?: ReporterConfig["links"];
  readonly #runtime: ReporterRuntime;
  readonly #fileScopes = new Map<string, string>();
  readonly #tests = new Map<string, TestState>();
  readonly #pendingTestMessages = new Map<string, RuntimeMessage[]>();
  readonly #pendingHookMessages = new Map<string, RuntimeMessage[]>();
  #ended = false;

  constructor(config: ReporterConfig = {}) {
    const { links, resultsDir, ...restConfig } = config;

    this.#linkConfig = links;

    this.#runtime = new ReporterRuntime({
      ...restConfig,
      links,
      writer: createDefaultWriter({ resultsDir }),
    });

    this.#runtime.registerProcessExitHandler();
    this.#runtime.writeCategoriesDefinitions();
    this.#runtime.writeEnvironmentInfo();
  }

  consumeStateChange = (event: AvaStateChangeEvent) => {
    if (this.#ended) {
      return;
    }

    if (isRuntimeMessageEvent(event)) {
      this.#handleRuntimeMessages(event);
      return;
    }

    if (isGlobalRuntimeMessageEvent(event)) {
      this.#runtime.applyGlobalRuntimeMessages(event.messages as RuntimeMessage[]);
      return;
    }

    switch (event.type) {
      case "selected-test":
        this.#handleSelectedTest(event);
        return;
      case "test-passed":
        this.#handleTestPassed(event);
        return;
      case "test-failed":
        this.#handleTestFailed(event);
        return;
      case "hook-finished":
        this.#handleHookFinished(event);
        return;
      case "hook-failed":
        this.#handleHookFailed(event);
        return;
      case "timeout":
        this.#handlePendingTests(event, `Timed out after ${event.period ?? "configured"}ms`);
        return;
      case "process-exit":
        this.#handlePendingTests(event, "Unexpected process.exit() call", event.testFile);
        return;
      case "internal-error":
      case "uncaught-exception":
      case "unhandled-rejection":
      case "shared-worker-error":
      case "worker-failed":
        this.#handleSyntheticError(event);
        return;
      case "end":
      case "interrupt":
        this.endRun();
        return;
      default:
        return;
    }
  };

  endRun = () => {
    if (this.#ended) {
      return;
    }

    this.#ended = true;

    for (const testState of this.#tests.values()) {
      if (!testState.stopped) {
        this.#runtime.updateTest(testState.uuid, (result) => {
          result.status = Status.BROKEN;
          result.stage = Stage.FINISHED;
          result.statusDetails = {
            message: "AVA finished before reporting a test result",
          };
        });
        this.#runtime.stopTest(testState.uuid);
        testState.stopped = true;
      }
    }

    for (const testState of this.#tests.values()) {
      if (!testState.written) {
        this.#runtime.writeTest(testState.uuid);
        testState.written = true;
      }
    }

    for (const testState of this.#tests.values()) {
      this.#runtime.writeScope(testState.scopeUuid);
    }

    for (const scopeUuid of this.#fileScopes.values()) {
      this.#runtime.writeScope(scopeUuid);
    }
  };

  #ensureFileScope = (testFile: string) => {
    const key = testFile || "<unknown>";
    let scopeUuid = this.#fileScopes.get(key);

    if (!scopeUuid) {
      scopeUuid = this.#runtime.startScope();
      this.#fileScopes.set(key, scopeUuid);
    }

    return scopeUuid;
  };

  #formatLinks = (links: Link[]) => (this.#linkConfig ? formatLinks(this.#linkConfig, links) : links);

  #handleSelectedTest = (event: AvaStateChangeEvent) => {
    if (!event.title) {
      return;
    }

    const testFile = getEventFile(event);
    const key = getTestKey(testFile, event.title);

    if (this.#tests.has(key)) {
      return;
    }

    const { cleanTitle, labels, links } = extractMetadataFromString(event.title);
    const logicalTitle = cleanTitle || event.title;
    const fullName = getFullName(testFile, logicalTitle);
    const fileScopeUuid = this.#ensureFileScope(testFile);
    const scopeUuid = this.#runtime.startScope();
    const result: StartTestResult = {
      name: logicalTitle,
      fullName,
      testCaseName: logicalTitle,
      titlePath: normalizeTitlePath(testFile),
      stage: Stage.RUNNING,
      labels: [
        getLanguageLabel(),
        getFrameworkLabel("ava"),
        getHostLabel(),
        getThreadLabel(),
        getPackageLabel(testFile),
        getFallbackTestCaseIdLabel(md5(fullName)),
        ...getEnvironmentLabels(),
        ...labels,
      ],
      links: this.#formatLinks(links),
    };
    const uuid = this.#runtime.startTest(result, [fileScopeUuid, scopeUuid]);
    const testState: TestState = {
      file: testFile,
      key,
      scopeUuid,
      stopped: false,
      title: event.title,
      uuid,
      written: false,
    };

    this.#tests.set(key, testState);

    this.#applyBufferedTestMessages(key, uuid);

    if (event.skip || event.todo) {
      this.#runtime.updateTest(uuid, (result) => {
        result.status = Status.SKIPPED;
        result.stage = Stage.PENDING;
        result.statusDetails = {
          message: event.todo ? "TODO" : "Skipped",
        };
      });
      this.#runtime.stopTest(uuid, { duration: 0 });
      testState.stopped = true;
    }
  };

  #handleTestPassed = (event: AvaStateChangeEvent) => {
    const testState = this.#getOrStartTest(event);

    if (!testState || testState.stopped) {
      return;
    }

    this.#attachLogs(testState.uuid, event.logs);
    this.#runtime.updateTest(testState.uuid, (result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
    this.#runtime.stopTest(testState.uuid, { duration: event.duration });
    testState.stopped = true;
  };

  #handleTestFailed = (event: AvaStateChangeEvent) => {
    const testState = this.#getOrStartTest(event);

    if (!testState || testState.stopped) {
      return;
    }

    this.#attachLogs(testState.uuid, event.logs);
    this.#runtime.updateTest(testState.uuid, (result) => {
      result.status = getStatusFromSerializedError(event.err);
      result.stage = Stage.FINISHED;
      result.statusDetails = getStatusDetails(event.err);
    });
    this.#runtime.stopTest(testState.uuid, { duration: event.duration });
    testState.stopped = true;
  };

  #handleRuntimeMessages = (event: AllureAvaRuntimeMessageEvent) => {
    if (!event.title) {
      this.#runtime.applyGlobalRuntimeMessages(event.messages as RuntimeMessage[]);
      return;
    }

    const key = getTestKey(getEventFile(event), event.title);
    const messages = event.messages as RuntimeMessage[];

    if (event.isHook) {
      const pending = this.#pendingHookMessages.get(key) ?? [];
      pending.push(...messages);
      this.#pendingHookMessages.set(key, pending);
      return;
    }

    const testState = this.#tests.get(key);
    if (!testState) {
      const pending = this.#pendingTestMessages.get(key) ?? [];
      pending.push(...messages);
      this.#pendingTestMessages.set(key, pending);
      return;
    }

    this.#runtime.applyRuntimeMessages(testState.uuid, messages);
  };

  #handleHookFinished = (event: AvaStateChangeEvent) => {
    this.#writeFixture(event, Status.PASSED);
  };

  #handleHookFailed = (event: AvaStateChangeEvent) => {
    this.#writeFixture(event, getStatusFromSerializedError(event.err), getStatusDetails(event.err));
  };

  #writeFixture = (event: AvaStateChangeEvent, status: Status, statusDetails?: NormalizedStatusDetails) => {
    if (!event.title) {
      return;
    }

    const testFile = getEventFile(event);
    const scopeUuid = this.#resolveHookScope(testFile, event.title);
    const fixtureUuid = this.#runtime.startFixture(scopeUuid, getFixtureType(event.title), {
      name: event.title,
      stage: Stage.RUNNING,
    });

    if (!fixtureUuid) {
      return;
    }

    const pendingMessages = this.#pendingHookMessages.get(getTestKey(testFile, event.title));
    if (pendingMessages?.length) {
      this.#runtime.applyRuntimeMessages(fixtureUuid, pendingMessages);
      this.#pendingHookMessages.delete(getTestKey(testFile, event.title));
    }

    this.#attachLogs(fixtureUuid, event.logs);
    this.#runtime.updateFixture(fixtureUuid, (fixture) => {
      fixture.status = status;
      if (statusDetails) {
        fixture.statusDetails = statusDetails;
      }
    });
    this.#runtime.stopFixture(fixtureUuid, { duration: event.duration });
  };

  #resolveHookScope = (testFile: string, hookTitle: string) => {
    const targetTitle = getHookTargetTitle(hookTitle);

    if (targetTitle) {
      const testState = this.#tests.get(getTestKey(testFile, targetTitle));
      if (testState) {
        return testState.scopeUuid;
      }
    }

    return this.#ensureFileScope(testFile);
  };

  #getOrStartTest = (event: AvaStateChangeEvent) => {
    if (!event.title) {
      return undefined;
    }

    const testFile = getEventFile(event);
    const key = getTestKey(testFile, event.title);
    const existing = this.#tests.get(key);

    if (existing) {
      return existing;
    }

    this.#handleSelectedTest({
      type: "selected-test",
      title: event.title,
      testFile,
      knownFailing: event.knownFailing,
      skip: false,
      todo: false,
    });

    return this.#tests.get(key);
  };

  #applyBufferedTestMessages = (key: string, uuid: string) => {
    const pendingMessages = this.#pendingTestMessages.get(key);

    if (!pendingMessages?.length) {
      return;
    }

    this.#runtime.applyRuntimeMessages(uuid, pendingMessages);
    this.#pendingTestMessages.delete(key);
  };

  #attachLogs = (rootUuid: string, logs: string[] | undefined) => {
    if (!logs?.length) {
      return;
    }

    this.#runtime.writeAttachment(rootUuid, undefined, "AVA logs", Buffer.from(logs.join("\n"), "utf8"), {
      contentType: "text/plain",
      wrapInStep: false,
    });
  };

  #handlePendingTests = (event: AvaStateChangeEvent, message: string, onlyFile?: string) => {
    const pendingFiles = onlyFile === undefined ? [...(event.pendingTests?.keys() ?? [])] : [onlyFile];

    for (const pendingFile of pendingFiles) {
      for (const title of event.pendingTests?.get(pendingFile) ?? []) {
        const testState = this.#tests.get(getTestKey(pendingFile, title));
        if (!testState || testState.stopped) {
          continue;
        }

        this.#runtime.updateTest(testState.uuid, (result) => {
          result.status = Status.BROKEN;
          result.stage = Stage.FINISHED;
          result.statusDetails = {
            message,
          };
        });
        this.#runtime.stopTest(testState.uuid);
        testState.stopped = true;
      }
    }
  };

  #handleSyntheticError = (event: AvaStateChangeEvent) => {
    const testFile = getEventFile(event);
    const title = `AVA ${event.type}`;
    const fullName = getFullName(testFile || "<unknown>", title);
    const result: StartTestResult = {
      name: title,
      fullName,
      testCaseName: title,
      titlePath: testFile ? normalizeTitlePath(testFile) : [],
      labels: [
        getLanguageLabel(),
        getFrameworkLabel("ava"),
        getHostLabel(),
        getThreadLabel(),
        ...(testFile ? [getPackageLabel(testFile)] : []),
        getFallbackTestCaseIdLabel(md5(fullName)),
        ...getEnvironmentLabels(),
      ],
      stage: Stage.RUNNING,
    };
    const uuid = this.#runtime.startTest(result, testFile ? [this.#ensureFileScope(testFile)] : []);

    this.#runtime.updateTest(uuid, (result) => {
      result.status = Status.BROKEN;
      result.stage = Stage.FINISHED;
      result.statusDetails = event.err
        ? getStatusDetails(event.err)
        : {
            message: event.signal
              ? `Worker exited with signal ${event.signal}`
              : event.nonZeroExitCode
                ? `Worker exited with code ${event.nonZeroExitCode}`
                : title,
          };
    });
    this.#runtime.stopTest(uuid);
    this.#runtime.writeTest(uuid);
  };
}
