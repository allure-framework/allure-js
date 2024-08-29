/* eslint max-lines: 0 */
import { extname } from "path";
import {
  type Attachment,
  type AttachmentOptions,
  type FixtureResult,
  Stage,
  type StepResult,
  type TestResult,
} from "../../model.js";
import type {
  Category,
  EnvironmentInfo,
  RuntimeAttachmentContentMessage,
  RuntimeAttachmentPathMessage,
  RuntimeMessage,
  RuntimeMetadataMessage,
  RuntimeStartStepMessage,
  RuntimeStepMetadataMessage,
  RuntimeStopStepMessage,
} from "../types.js";
import { LifecycleState } from "./LifecycleState.js";
import { Notifier } from "./Notifier.js";
import { createFixtureResult, createStepResult, createTestResult } from "./factory.js";
import { hasSkipLabel } from "./testplan.js";
import type {
  FixtureResultWrapper,
  FixtureType,
  LinkConfig,
  ReporterRuntimeConfig,
  TestScope,
  Writer,
} from "./types.js";
import { deepClone, formatLinks, getTestResultHistoryId, getTestResultTestCaseId, randomUuid } from "./utils.js";
import { buildAttachmentFileName } from "./utils/attachments.js";
import { resolveWriter } from "./writer/loader.js";

interface StepStack {
  clear(): void;

  removeRoot(rootUuid: string): void;

  currentStep(rootUuid: string): string | undefined;

  addStep(rootUuid: string, stepUuid: string): void;

  removeStep(stepUuid: string): void;
}

class DefaultStepStack implements StepStack {
  private stepsByRoot: Map<string, string[]> = new Map();
  private rootsByStep: Map<string, string> = new Map();

  clear = (): void => {
    this.stepsByRoot.clear();
    this.rootsByStep.clear();
  };

  removeRoot = (rootUuid: string): void => {
    const maybeValue = this.stepsByRoot.get(rootUuid);
    this.stepsByRoot.delete(rootUuid);
    if (maybeValue) {
      maybeValue.forEach((stepUuid) => this.rootsByStep.delete(stepUuid));
    }
  };

  currentStep = (rootUuid: string): string | undefined => {
    const maybeValue = this.stepsByRoot.get(rootUuid);
    if (!maybeValue) {
      return;
    }
    return maybeValue[maybeValue.length - 1];
  };

  addStep = (rootUuid: string, stepUuid: string): void => {
    const maybeValue = this.stepsByRoot.get(rootUuid);
    if (!maybeValue) {
      this.stepsByRoot.set(rootUuid, [stepUuid]);
    } else {
      maybeValue.push(stepUuid);
    }
    this.rootsByStep.set(stepUuid, rootUuid);
  };

  removeStep(stepUuid: string) {
    const rootUuid = this.rootsByStep.get(stepUuid);
    if (!rootUuid) {
      return;
    }
    const maybeValue = this.stepsByRoot.get(rootUuid);
    if (!maybeValue) {
      return;
    }
    const newValue = maybeValue.filter((value) => value !== stepUuid);
    this.stepsByRoot.set(rootUuid, newValue);
  }
}

export class ReporterRuntime {
  private readonly state = new LifecycleState();
  private notifier: Notifier;
  private stepStack: StepStack = new DefaultStepStack();
  writer: Writer;
  categories?: Category[];
  environmentInfo?: EnvironmentInfo;
  linkConfig?: LinkConfig;

  constructor({ writer, listeners = [], environmentInfo, categories, links }: ReporterRuntimeConfig) {
    this.writer = resolveWriter(writer);
    this.notifier = new Notifier({ listeners });
    this.categories = categories;
    this.environmentInfo = environmentInfo;
    this.linkConfig = links;
  }

  startScope = (): string => {
    const uuid = randomUuid();
    this.state.setScope(uuid);
    return uuid;
  };

  updateScope = (uuid: string, updateFunc: (scope: TestScope) => void): void => {
    const scope = this.state.getScope(uuid);
    if (!scope) {
      // eslint-disable-next-line no-console
      console.error(`count not update scope: no scope with uuid ${uuid} is found`);
      return;
    }

    updateFunc(scope);
  };

  writeScope = (uuid: string) => {
    const scope = this.state.getScope(uuid);
    if (!scope) {
      // eslint-disable-next-line no-console
      console.error(`count not write scope: no scope with uuid ${uuid} is found`);
      return;
    }

    this.#writeFixturesOfScope(scope);
    this.state.deleteScope(scope.uuid);
  };

  startFixture = (scopeUuid: string, type: FixtureType, fixtureResult: Partial<FixtureResult>): string | undefined => {
    const scope = this.state.getScope(scopeUuid);
    if (!scope) {
      // eslint-disable-next-line no-console
      console.error(`count not start fixture: no scope with uuid ${scopeUuid} is found`);
      return;
    }

    const uuid = randomUuid();
    const wrappedFixture = this.state.setFixtureResult(scopeUuid, uuid, type, {
      ...createFixtureResult(),
      start: Date.now(),
      ...fixtureResult,
    });

    scope.fixtures.push(wrappedFixture);
    return uuid;
  };

  updateFixture = (uuid: string, updateFunc: (result: FixtureResult) => void): void => {
    const fixture = this.state.getFixtureResult(uuid);

    if (!fixture) {
      // eslint-disable-next-line no-console
      console.error(`could not update fixture: no fixture with uuid ${uuid} is found`);
      return;
    }

    updateFunc(fixture);
  };

  stopFixture = (uuid: string, opts?: { stop?: number; duration?: number }): void => {
    const fixture = this.state.getFixtureResult(uuid);
    if (!fixture) {
      // eslint-disable-next-line no-console
      console.error(`could not stop fixture: no fixture with uuid ${uuid} is found`);
      return;
    }

    const startStop = this.#calculateTimings(fixture.start, opts?.stop, opts?.duration);
    fixture.start = startStop.start;
    fixture.stop = startStop.stop;

    fixture.stage = Stage.FINISHED;
  };

  startTest = (result: Partial<TestResult>, scopeUuids: string[] = []): string => {
    const uuid = randomUuid();
    const testResult: TestResult = {
      ...createTestResult(uuid),
      start: Date.now(),
      ...deepClone(result),
    };

    this.notifier.beforeTestResultStart(testResult);

    scopeUuids.forEach((scopeUuid) => {
      const scope = this.state.getScope(scopeUuid);
      if (!scope) {
        // eslint-disable-next-line no-console
        console.error(`count not link test to the scope: no scope with uuid ${uuid} is found`);
        return;
      }
      scope.tests.push(uuid);
    });

    this.state.setTestResult(uuid, testResult, scopeUuids);
    this.notifier.afterTestResultStart(testResult);
    return uuid;
  };

  updateTest = (uuid: string, updateFunc: (result: TestResult) => void): void => {
    const testResult = this.state.getTestResult(uuid);

    if (!testResult) {
      // eslint-disable-next-line no-console
      console.error(`could not update test result: no test with uuid ${uuid}) is found`);
      return;
    }

    this.notifier.beforeTestResultUpdate(testResult);
    updateFunc(testResult);
    this.notifier.afterTestResultUpdate(testResult);
  };

  stopTest = (uuid: string, opts?: { stop?: number; duration?: number }) => {
    const wrapped = this.state.getWrappedTestResult(uuid);
    if (!wrapped) {
      // eslint-disable-next-line no-console
      console.error(`could not stop test result: no test with uuid ${uuid}) is found`);
      return;
    }

    const testResult = wrapped.value;

    this.notifier.beforeTestResultStop(testResult);
    testResult.testCaseId ??= getTestResultTestCaseId(testResult);
    testResult.historyId ??= getTestResultHistoryId(testResult);

    const startStop = this.#calculateTimings(testResult.start, opts?.stop, opts?.duration);
    testResult.start = startStop.start;
    testResult.stop = startStop.stop;

    const scopeUuids = wrapped.scopeUuids;
    scopeUuids.forEach((scopeUuid) => {
      const scope = this.state.getScope(scopeUuid);
      if (scope?.labels) {
        testResult.labels = [...testResult.labels, ...scope.labels];
      }
    });

    this.notifier.afterTestResultStop(testResult);
  };

  writeTest = (uuid: string) => {
    const testResult = this.state.getTestResult(uuid);
    if (!testResult) {
      // eslint-disable-next-line no-console
      console.error(`could not write test result: no test with uuid ${uuid} is found`);
      return;
    }

    if (hasSkipLabel(testResult.labels)) {
      this.state.deleteTestResult(uuid);
      return;
    }

    this.notifier.beforeTestResultWrite(testResult);

    this.writer.writeResult(testResult);
    this.state.deleteTestResult(uuid);

    this.notifier.afterTestResultWrite(testResult);
  };

  currentStep = (rootUuid: string): string | undefined => {
    return this.stepStack.currentStep(rootUuid);
  };

  startStep = (
    rootUuid: string,
    parentStepUuid: string | null | undefined,
    result: Partial<StepResult>,
  ): string | undefined => {
    const parent = this.#findParent(rootUuid, parentStepUuid);
    if (!parent) {
      // eslint-disable-next-line no-console
      console.error(
        `could not start test step: no context for root ${rootUuid} and parentStepUuid ${JSON.stringify(parentStepUuid)} is found`,
      );
      return;
    }
    const stepResult: StepResult = {
      ...createStepResult(),
      start: Date.now(),
      ...result,
    };
    parent.steps.push(stepResult);
    const stepUuid = randomUuid();
    this.state.setStepResult(stepUuid, stepResult);

    this.stepStack.addStep(rootUuid, stepUuid);

    return stepUuid;
  };

  updateStep = (uuid: string, updateFunc: (stepResult: StepResult) => void) => {
    const step = this.state.getStepResult(uuid)!;
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`could not update test step: no step with uuid ${uuid} is found`);
      return;
    }

    updateFunc(step);
  };

  stopStep = (uuid: string, opts?: { stop?: number; duration?: number }) => {
    const step = this.state.getStepResult(uuid);
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`could not stop test step: no step with uuid ${uuid} is found`);
      return;
    }

    this.notifier.beforeStepStop(step);

    const startStop = this.#calculateTimings(step.start, opts?.stop, opts?.duration);
    step.start = startStop.start;
    step.stop = startStop.stop;

    step.stage = Stage.FINISHED;

    this.stepStack.removeStep(uuid);

    this.notifier.afterStepStop(step);
  };

  writeAttachment = (
    rootUuid: string,
    parentStepUuid: string | null | undefined,
    attachmentName: string,
    attachmentContentOrPath: Buffer | string,
    options: AttachmentOptions & { wrapInStep?: boolean; timestamp?: number },
  ) => {
    const parent = this.#findParent(rootUuid, parentStepUuid);
    if (!parent) {
      // eslint-disable-next-line no-console
      console.error(
        `could not write test attachment: no context for root ${rootUuid} and parentStepUuid ${JSON.stringify(parentStepUuid)} is found`,
      );
      return;
    }

    const isPath = typeof attachmentContentOrPath === "string";
    const fileExtension = options.fileExtension ?? (isPath ? extname(attachmentContentOrPath) : undefined);
    const attachmentFileName = buildAttachmentFileName({
      contentType: options.contentType,
      fileExtension,
    });

    if (isPath) {
      this.writer.writeAttachmentFromPath(attachmentFileName, attachmentContentOrPath);
    } else {
      this.writer.writeAttachment(attachmentFileName, attachmentContentOrPath);
    }

    const attachment: Attachment = {
      name: attachmentName,
      source: attachmentFileName,
      type: options.contentType,
    };

    if (options.wrapInStep) {
      const { timestamp = Date.now() } = options;
      parent.steps.push({
        name: attachmentName,
        attachments: [attachment],
        start: timestamp,
        stop: timestamp,
      } as StepResult);
    } else {
      parent.attachments.push(attachment);
    }
  };

  writeEnvironmentInfo = () => {
    if (!this.environmentInfo) {
      return;
    }

    this.writer.writeEnvironmentInfo(this.environmentInfo);
  };

  writeCategoriesDefinitions = () => {
    if (!this.categories) {
      return;
    }

    const serializedCategories = this.categories.map((c) => {
      if (c.messageRegex instanceof RegExp) {
        c.messageRegex = c.messageRegex.source;
      }

      if (c.traceRegex instanceof RegExp) {
        c.traceRegex = c.traceRegex.source;
      }

      return c;
    });

    this.writer.writeCategoriesDefinitions(serializedCategories);
  };

  applyRuntimeMessages = (rootUuid: string, messages: RuntimeMessage[]) => {
    messages.forEach((message) => {
      switch (message.type) {
        case "metadata":
          this.#handleMetadataMessage(rootUuid, message.data);
          return;
        case "step_metadata":
          this.#handleStepMetadataMessage(rootUuid, message.data);
          return;
        case "step_start":
          this.#handleStartStepMessage(rootUuid, message.data);
          return;
        case "step_stop":
          this.#handleStopStepMessage(rootUuid, message.data);
          return;
        case "attachment_content":
          this.#handleAttachmentContentMessage(rootUuid, message.data);
          return;
        case "attachment_path":
          this.#handleAttachmentPathMessage(rootUuid, message.data);
          return;
        default:
          // eslint-disable-next-line no-console
          console.error(`could not apply runtime messages: unknown message ${JSON.stringify(message)}`);
          return;
      }
    });
  };

  #handleMetadataMessage = (rootUuid: string, message: RuntimeMetadataMessage["data"]) => {
    // only display name could be set to fixture.
    const fixtureResult = this.state.getWrappedFixtureResult(rootUuid);
    const { links, labels, parameters, displayName, testCaseId, historyId, description, descriptionHtml } = message;

    if (fixtureResult) {
      if (displayName) {
        this.updateFixture(rootUuid, (result) => {
          result.name = displayName;
        });
      }

      if (historyId) {
        // eslint-disable-next-line no-console
        console.error("historyId can't be changed within test fixtures");
      }
      if (testCaseId) {
        // eslint-disable-next-line no-console
        console.error("testCaseId can't be changed within test fixtures");
      }

      if (links || labels || parameters || description || descriptionHtml) {
        // in some frameworks, afterEach methods can be executed before test stop event, while
        // in others after. To remove the possible undetermined behaviour we only allow
        // using runtime metadata API in before hooks.
        if (fixtureResult.type === "after") {
          // eslint-disable-next-line no-console
          console.error("metadata messages isn't supported for after test fixtures");
          return;
        }

        this.updateScope(fixtureResult.scopeUuid, (scope) => {
          if (links) {
            scope.links = [...scope.links, ...(this.linkConfig ? formatLinks(this.linkConfig, links) : links)];
          }
          if (labels) {
            scope.labels = [...scope.labels, ...labels];
          }
          if (parameters) {
            scope.parameters = [...scope.parameters, ...parameters];
          }
          if (description) {
            scope.description = description;
          }
          if (descriptionHtml) {
            scope.descriptionHtml = descriptionHtml;
          }
        });
      }

      return;
    }

    this.updateTest(rootUuid, (result) => {
      if (links) {
        result.links = [...result.links, ...(this.linkConfig ? formatLinks(this.linkConfig, links) : links)];
      }
      if (labels) {
        result.labels = [...result.labels, ...labels];
      }
      if (parameters) {
        result.parameters = [...result.parameters, ...parameters];
      }
      if (displayName) {
        result.name = displayName;
      }
      if (testCaseId) {
        result.testCaseId = testCaseId;
      }
      if (historyId) {
        result.historyId = historyId;
      }
      if (description) {
        result.description = description;
      }
      if (descriptionHtml) {
        result.descriptionHtml = descriptionHtml;
      }
    });
  };

  #handleStepMetadataMessage = (rootUuid: string, message: RuntimeStepMetadataMessage["data"]) => {
    const stepUuid = this.currentStep(rootUuid);
    if (!stepUuid) {
      // eslint-disable-next-line no-console
      console.error("could not handle step metadata message: no step is running");
      return;
    }
    const { name, parameters } = message;
    this.updateStep(stepUuid, (stepResult) => {
      if (name) {
        stepResult.name = name;
      }
      if (parameters) {
        stepResult.parameters = [...stepResult.parameters, ...parameters];
      }
    });
  };

  #handleStartStepMessage = (rootUuid: string, message: RuntimeStartStepMessage["data"]) => {
    this.startStep(rootUuid, undefined, { ...message });
  };

  #handleStopStepMessage = (rootUuid: string, message: RuntimeStopStepMessage["data"]) => {
    const stepUuid = this.currentStep(rootUuid);
    if (!stepUuid) {
      // eslint-disable-next-line no-console
      console.error("could not handle step stop message: no step is running");
      return;
    }
    this.updateStep(stepUuid, (result) => {
      if (message.status && !result.status) {
        result.status = message.status;
      }
      if (message.statusDetails) {
        result.statusDetails = { ...result.statusDetails, ...message.statusDetails };
      }
    });
    this.stopStep(stepUuid, { stop: message.stop });
  };

  #handleAttachmentContentMessage = (rootUuid: string, message: RuntimeAttachmentContentMessage["data"]) => {
    this.writeAttachment(rootUuid, undefined, message.name, Buffer.from(message.content, message.encoding), {
      encoding: message.encoding,
      contentType: message.contentType,
      fileExtension: message.fileExtension,
      wrapInStep: message.wrapInStep,
      timestamp: message.timestamp,
    });
  };

  #handleAttachmentPathMessage = (rootUuid: string, message: RuntimeAttachmentPathMessage["data"]) => {
    this.writeAttachment(rootUuid, undefined, message.name, message.path, {
      contentType: message.contentType,
      fileExtension: message.fileExtension,
      wrapInStep: message.wrapInStep,
      timestamp: message.timestamp,
    });
  };

  #findParent = (
    rootUuid: string,
    parentStepUuid: string | null | undefined,
  ): FixtureResult | TestResult | StepResult | undefined => {
    const root = this.state.getExecutionItem(rootUuid);
    if (!root) {
      return;
    }

    if (parentStepUuid === null) {
      return root;
    } else if (parentStepUuid === undefined) {
      const stepUuid = this.currentStep(rootUuid);
      return stepUuid ? this.state.getStepResult(stepUuid) : root;
    } else {
      return this.state.getStepResult(parentStepUuid);
    }
  };

  #writeFixturesOfScope = ({ fixtures, tests }: TestScope) => {
    const writtenFixtures = new Set<string>();
    if (tests.length) {
      for (const wrappedFixture of fixtures) {
        if (!writtenFixtures.has(wrappedFixture.uuid)) {
          this.#writeContainer(tests, wrappedFixture);
          this.state.deleteFixtureResult(wrappedFixture.uuid);
          writtenFixtures.add(wrappedFixture.uuid);
        }
      }
    }
  };

  #writeContainer = (tests: string[], wrappedFixture: FixtureResultWrapper) => {
    const fixture = wrappedFixture.value;
    const befores = wrappedFixture.type === "before" ? [wrappedFixture.value] : [];
    const afters = wrappedFixture.type === "after" ? [wrappedFixture.value] : [];
    this.writer.writeGroup({
      uuid: wrappedFixture.uuid,
      name: fixture.name,
      children: [...new Set(tests)],
      befores,
      afters,
    });
  };

  #calculateTimings = (start?: number, stop?: number, duration?: number): { start?: number; stop?: number } => {
    const result: { start?: number; stop?: number } = { start, stop };
    if (duration) {
      const normalisedDuration = Math.max(0, duration);
      if (result.stop !== undefined) {
        result.start = result.stop - normalisedDuration;
      } else if (result.start !== undefined) {
        result.stop = result.start + normalisedDuration;
      } else {
        result.stop = Date.now();
        result.start = result.stop - normalisedDuration;
      }
    } else {
      if (result.stop === undefined) {
        result.stop = Date.now();
      }
      if (result.start === undefined) {
        result.start = result.stop;
      }
    }
    return result;
  };
}
