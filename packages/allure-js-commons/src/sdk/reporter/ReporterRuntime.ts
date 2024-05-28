/* eslint max-lines: 0 */
import type { AttachmentOptions, FixtureResult, Link, StepResult, TestResult } from "../../model.js";
import { Stage } from "../../model.js";
import type {
  Category,
  EnvironmentInfo,
  Messages,
  RawAttachment,
  RuntimeMessage,
  RuntimeMetadataMessage,
  RuntimeRawAttachmentMessage,
  RuntimeStartStepMessage,
  RuntimeStepMetadataMessage,
  RuntimeStopStepMessage,
} from "../types.js";
import { LifecycleState } from "./LifecycleState.js";
import { MutableAllureContextHolder, StaticContextProvider } from "./context/StaticAllureContextProvider.js";
import type { AllureContextProvider } from "./context/types.js";
import { createFixtureResult, createStepResult, createTestResult } from "./factory.js";
import { Notifier } from "./notifier.js";
import type {
  Config,
  Crypto,
  FixtureType,
  FixtureWrapper,
  LinkConfig,
  TestScope,
  WellKnownWriters,
  Writer,
} from "./types.js";
import { deepClone, typeToExtension } from "./utils.js";
import { getTestResultHistoryId, getTestResultTestCaseId, resolveWriter } from "./utils.js";
import * as wellKnownCommonWriters from "./writer/index.js";

type StartScopeOpts = {
  /**
   * If set to `true`, a manual scope will be created. A manual scope doesn't affect
   * the context. Therefore, tests and fixtures aren't linked to it
   * automatically.
   *
   * Use `linkFixtures`, `updateScope`, or test and fixture start options to fill
   * such scope with tests and fixtures.
   */
  manual?: boolean;

  /**
   * If set to the UUID of an existing scope, the new scope will be created as its
   * sub-scope.
   *
   * Has an effect only if `manual` is `true`.
   */
  parent?: string;
};

type StartFixtureOpts = {
  /**
   * The UUID of the scope that should be associated with the fixture. Defaults to the current
   * scope of the context.
   *
   * If set to `null`, the fixture won't be attached to any scope (except the
   * dedicated one in case `dedicatedScope` is `true`).
   */
  scope?: string | null;

  /**
   * If set to `true`, an extra scope will be created to hold the fixture result.
   * The scope gets the same UUID as the fixture result and isn't pushed into
   * the context.
   *
   * The scope denoted by the `scope` option will serve as the parent.
   */
  dedicatedScope?: boolean;

  /**
   * The UUIDs of tests affected by the fixture. Those tests will be associated
   * with the fixture's scope.
   *
   * If the `scope` option is set to `null`, implicitly sets `dedicatedScope` to `true`.
   */
  tests?: string[];
};

type StartTestOpts = {
  /**
   * The UUID of a scope the test should be associated with. Defaults to the current one.
   *
   * If set to `null`, the test won't be associated with any scope (except the
   * dedicated one in case the `dedicatedScope` option is `true`).
   */
  scope?: string | null;

  /**
   * If set to `true`, an extra scope will be created with the same UUID as the
   * test result. The test will be attached to that scope.
   *
   * The scope denoted by the `scope` option will serve as the parent.
   */
  dedicatedScope?: boolean;
};

type StopOpts = {
  /**
   * The test's or fixture's stop time. Defaults to `Date.now()`.
   */
  stop?: number;

  /**
   * The UUID of a test or fixture to stop.
   */
  uuid?: string;
};

type LinkFixturesOpts = {
  /**
   * The UUIDs of fixtures to associate with the scope or tests.
   */
  fixtures?: readonly string[];

  /**
   * The UUID of a scope to associate with the fixture or tests.
   */
  scope?: string;

  /**
   * The UUIDs of tests to associate with the fixture or scope.
   */
  tests?: readonly string[];
};

type ApplyMessagesOpts<T> = {
  fixtureUuid?: string;
  testUuid?: string;
  customHandler?: (
    message: Exclude<Messages<T>, RuntimeMessage>,
    fixture?: FixtureResult,
    test?: TestResult,
    step?: StepResult,
  ) => void | Promise<void>;
};

type MessageTargets = {
  fixtureUuid: string | undefined;
  fixture?: FixtureResult;
  testUuid: string | undefined;
  test?: TestResult;
  rootUuid: string;
  root: TestResult | FixtureResult;
  step?: StepResult;
};

export class ReporterRuntime {
  private notifier: Notifier;
  private links: LinkConfig[] = [];
  private contextProvider: AllureContextProvider;
  state = new LifecycleState();
  writer: Writer;
  crypto: Crypto;
  categories?: Category[];
  environmentInfo?: EnvironmentInfo;

  constructor({
    writer,
    listeners = [],
    crypto,
    links = [],
    environmentInfo,
    categories,
    contextProvider = StaticContextProvider.wrap(new MutableAllureContextHolder()),
  }: Config & {
    crypto: Crypto;
  }) {
    this.writer = resolveWriter(this.getWellKnownWriters(), writer);
    this.notifier = new Notifier({ listeners });
    this.crypto = crypto;
    this.links = links;
    this.categories = categories;
    this.environmentInfo = environmentInfo;
    this.contextProvider = contextProvider;
  }

  hasScope = () => !!this.contextProvider.getScope();
  hasFixture = () => !!this.contextProvider.getFixture();
  hasTest = () => !!this.contextProvider.getTest();
  hasSteps = () => !!this.contextProvider.getStep();

  getCurrentTest = () => {
    const testUuid = this.contextProvider.getTest();
    return testUuid ? this.state.getTest(testUuid) : undefined;
  };

  getCurrentFixture = () => {
    const fixtureUuid = this.contextProvider.getFixture();
    return fixtureUuid ? this.state.getFixture(fixtureUuid) : undefined;
  };

  getCurrentStep = (root?: string) => {
    const stepUuid = this.contextProvider.getStep(root);
    return stepUuid ? this.state.getStep(stepUuid) : undefined;
  };

  getCurrentExecutingItem = (root?: string) => {
    const uuid = this.contextProvider.getExecutingItem(root);
    return uuid ? this.state.getExecutionItem(uuid) : undefined;
  };

  getCurrentScope = () => {
    const scopeUuid = this.contextProvider.getScope();
    return scopeUuid ? this.state.getScope(scopeUuid) : undefined;
  };

  /**
   * Creates a new scope. The scope is pushed into the context unless the `manual`
   * option is set to `true`.
   *
   * @param opts
   * @returns
   */
  startScope = (opts: StartScopeOpts = {}) => this.startScopeWithUuid(this.crypto.uuid(), opts);

  updateScope = (updateFunc: (scope: TestScope) => void, uuid?: string) => {
    const resolvedUuid = uuid ?? this.contextProvider.getScope();
    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("No current scope to update!");
      return;
    }

    const scope = this.state.getScope(resolvedUuid);
    if (!scope) {
      // eslint-disable-next-line no-console
      console.error(`No scope ${resolvedUuid} to update!`);
      return;
    }

    updateFunc(scope);
  };

  /**
   * Removes a scope from the context. Use `writeScope` to emit its fixtures on disk then.
   *
   * If you just want to write the current stop, you may omit the call to this method and
   * call `writeScope` with no uuid.
   *
   * @param uuid The UUID of the scope. If not provided, the current scope will be stopped.
   *
   * @returns The UUID of the scope that has been stopped.
   */
  stopScope = (uuid?: string) => {
    const resolvedUuid = uuid ?? this.contextProvider.getScope();
    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("No current scope to stop!");
      return;
    }

    this.contextProvider.removeScope(uuid);
    return resolvedUuid;
  };

  /**
   * Writes all fixtures of a scope on disk.
   *
   * @param uuid The UUID of the scope. If not provided, the current scope will
   * be written and removed from the context. Don't call `stopScope` in that case.
   */
  writeScope = (uuid?: string) => {
    const resolvedUuid = uuid ?? this.stopScope();

    if (!resolvedUuid) {
      return;
    }

    const scope = this.state.getScope(resolvedUuid);
    if (!scope) {
      // eslint-disable-next-line no-console
      console.error(`No scope ${resolvedUuid} to write!`);
      return;
    }

    this.writeAllFixturesOfScope(scope);
    this.removeScopeFromParent(scope);
    this.state.deleteScope(resolvedUuid);
  };

  /**
   * Creates a new fixture result and puts it in the context as the current one.
   *
   * Use the `scope` parameter to control the fixture's scope. Use `updateScope`
   * or `linkFixtures` to associate fixtures with tests that can't be linked
   * automatically.
   *
   * Use `stopFixture` once the fixture is completed.
   *
   * Use `writeScope` or `writeFixture` to emit fixtures on disk.
   *
   * @param type The type of the fixture. It's either `"before"` or `"after"`.
   * @param fixtureResult The fixture result data.
   * @param scope
   * @param dedicatedScope
   * @param tests
   * @returns The UUID of the new fixture.
   */
  startFixture = (
    type: FixtureType,
    fixtureResult: Partial<FixtureResult>,
    { scope, dedicatedScope, tests }: StartFixtureOpts = {},
  ) => {
    dedicatedScope = dedicatedScope || (scope === null && !!tests);
    const scopeObj = this.resolveScope(scope);
    if (scopeObj === undefined) {
      // eslint-disable-next-line no-console
      console.error("Can't resolve the scope for a new fixture");
      return;
    }

    const uuid = this.crypto.uuid();
    const wrappedFixture = this.state.setFixtureResult(uuid, type, {
      ...createFixtureResult(),
      start: Date.now(),
      ...fixtureResult,
    });

    if (dedicatedScope || (tests && scopeObj === null)) {
      this.setUpFixtureDedicatedScope(wrappedFixture, tests, scopeObj);
    } else if (scopeObj !== null) {
      this.linkFixtureToScope(wrappedFixture, scopeObj, tests);
    }

    this.contextProvider.setFixture(uuid);
    return uuid;
  };

  updateFixture = (updateFunc: (result: FixtureResult) => void, uuid?: string) => {
    const resolvedUuid = uuid ?? this.contextProvider.getFixture();

    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("No current fixture to update!");
      return;
    }

    const fixture = this.state.getFixture(resolvedUuid);

    if (!fixture) {
      // eslint-disable-next-line no-console
      console.error(`No fixture (${resolvedUuid}) to update!`);
      return;
    }

    updateFunc(fixture);
  };

  /**
   * Stops a fixture and removes it from the context. The fixture result will persist in
   * the storage until it's written on disk with `writeScope` or `writeFixture`.
   *
   * @returns The UUID of the stopped fixture.
   */
  stopFixture = ({ uuid, stop }: StopOpts = {}) => {
    const resolvedUuid = uuid ?? this.contextProvider.getFixture();
    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("No current fixture to stop!");
      return;
    }

    const fixture = this.state.getFixture(resolvedUuid);
    if (!fixture) {
      // eslint-disable-next-line no-console
      console.error(`No fixture (${resolvedUuid}) to stop!`);
      return;
    }

    this.stopFixtureObj(fixture, uuid, stop);
    return resolvedUuid;
  };

  /**
   * Use to associate fixtures, scopes, and tests with each other.
   *
   * At least two arguments must be provided.
   */
  linkFixtures = ({ fixtures = [], scope, tests = [] }: LinkFixturesOpts) => {
    const wrappedFixtures = fixtures
      .map((f) => {
        const obj = this.state.getWrappedFixture(f);
        if (obj === undefined) {
          // eslint-disable-next-line no-console
          console.error(`No fixture (${f}) to link!`);
        }
        return obj;
      })
      .filter((f) => f) as FixtureWrapper[];

    const scopeObj = scope ? this.state.getScope(scope) : null;
    if (scopeObj === undefined) {
      // eslint-disable-next-line no-console
      console.error(`No scope (${scope!}) to link!`);
      return;
    }

    if (wrappedFixtures.length && scopeObj) {
      this.linkFixturesToScope(wrappedFixtures, scopeObj, tests);
      return;
    }

    if (wrappedFixtures.length && tests.length) {
      for (const fixture of wrappedFixtures) {
        if (fixture.scope) {
          this.linkTestsToScope(fixture.scope, tests);
        } else {
          this.setUpFixtureDedicatedScope(fixture, tests);
        }
      }
      return;
    }

    if (scopeObj && tests) {
      this.linkTestsToScope(scopeObj, tests);
      return;
    }

    // eslint-disable-next-line no-console
    console.error("Provide at least two arguments to link!");
  };

  /**
   * Emits a fixture on disk. Calls `stopFixture` prior to that in case the fixture
   * hasn't been stopped yet. Use this method if you want to manage fixtures manually.
   * Otherwise, use `writeScope`.
   *
   * If called without parameters, implicitly calls `stopFixture`. Make sure you don't call
   * `stopFixture` by yourself in that case.
   *
   * The method has no effect if the fixture isn't associated with at least one test.
   *
   * @param uuid The UUID of the fixture. If not provided, the current fixture will
   * be stopped and emitted. Don't call `stopFixture` in that case.
   */
  writeFixture = (uuid?: string) => {
    const resolvedUuid = uuid ?? this.stopFixture();
    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("Unable to stop the current fixture before write!");
      return;
    }

    const wrappedFixture = this.state.getWrappedFixture(resolvedUuid);
    if (!wrappedFixture) {
      // eslint-disable-next-line no-console
      console.error(`No fixture (${resolvedUuid}) to write!`);
      return;
    }

    const fixture = wrappedFixture.value;
    if (fixture.stage !== Stage.FINISHED) {
      this.stopFixtureObj(wrappedFixture.value, resolvedUuid);
    }

    const { scope } = wrappedFixture;
    if (scope) {
      this.writeContainer(scope.tests, wrappedFixture);
      this.removeFixtureFromScope(scope, wrappedFixture);
    }

    this.state.deleteFixtureResult(resolvedUuid);
  };

  startTest = (result: Partial<TestResult>, { scope, dedicatedScope }: StartTestOpts = {}) => {
    const stateObject = this.createTestResult(result);
    const uuid = stateObject.uuid;

    this.notifier.beforeTestResultStart(stateObject);

    const resolvedScope = dedicatedScope
      ? this.startScopeWithUuid(uuid, {
          manual: scope !== undefined,
          parent: scope ?? undefined,
        })
      : scope ?? this.contextProvider.getScope();

    if (resolvedScope) {
      this.introduceTestIntoScopes(uuid, resolvedScope);
    }

    this.state.setTestResult(uuid, stateObject);
    this.contextProvider.setTest(uuid);

    this.notifier.afterTestResultStart(stateObject);

    return uuid;
  };

  /**
   * Updates test result by uuid
   * @example
   * ```ts
   * runtime.update(uuid, (result) => {
   *   // change the result directly, you don't need to return anything
   *   result.name = "foo";
   * });
   * ```
   * @param updateFunc - a function that updates the test result; the result is passed as a single argument and should be mutated to apply the changes
   * @param uuid - test result uuid
   */
  updateTest = (updateFunc: (result: TestResult) => void, uuid?: string) => {
    const resolvedUuid = uuid ?? this.contextProvider.getTest();
    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test to update!");
      return;
    }
    const targetResult = this.state.getTest(resolvedUuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${resolvedUuid}) to update!`);
      return;
    }

    this.notifier.beforeTestResultUpdate(targetResult);
    updateFunc(targetResult);
    this.notifier.afterTestResultUpdate(targetResult);
  };

  stopTest = ({ uuid, stop }: StopOpts = {}) => {
    const resolvedUuid = uuid ?? this.contextProvider.getTest();
    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test to stop!");
      return;
    }

    const targetResult = this.state.getTest(resolvedUuid);
    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${resolvedUuid}) to stop!`);
      return;
    }

    this.notifier.beforeTestResultStop(targetResult);
    targetResult.testCaseId ??= getTestResultTestCaseId(this.crypto, targetResult);
    targetResult.historyId ??= getTestResultHistoryId(this.crypto, targetResult);
    targetResult.stop = stop || Date.now();

    this.notifier.afterTestResultStop(targetResult);
  };

  /**
   * Writes a test result on disk and removes it from the storage and the context.
   * @param uuid The UUID of the test. If not set, the current test result is written.
   */
  writeTest = (uuid?: string) => {
    const resolvedUuid = uuid ?? this.contextProvider.getTest();
    if (!resolvedUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test to write!");
      return;
    }

    const testResult = this.state.testResults.get(resolvedUuid);
    if (!testResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${resolvedUuid}) to write!`);
      return;
    }

    this.notifier.beforeTestResultWrite(testResult);

    this.writer.writeResult(testResult);
    this.contextProvider.removeTest(uuid);
    this.state.deleteTestResult(resolvedUuid);

    const currentScope = this.contextProvider.getScope();
    if (currentScope === resolvedUuid) {
      // Writes the scope introduced into the context by `startTest` with
      // `dedicatedScope` set to `true`.
      this.writeScope();
    }

    this.notifier.afterTestResultWrite(testResult);
  };

  /**
   * Starts a new step and pushes it into the context.
   *
   * @param result Data to be put into the step result object.
   * @param uuid The UUID of a test or fixture to attach the step to. If not set, the UUID of the current fixture is used.
   * If no fixture is running, the UUID of the current test is used.
   *
   * @returns The UUID of the step.
   */
  startStep = (result: Partial<StepResult>, uuid?: string) => {
    const parentUuid = this.contextProvider.getExecutingItem(uuid);
    if (!parentUuid) {
      // eslint-disable-next-line no-console
      console.error("No current step, fixture, or test to start a new step!");
      return;
    }

    const parent = this.state.getExecutionItem(parentUuid);
    if (!parent) {
      // eslint-disable-next-line no-console
      console.error(`No execution item (${parentUuid}) to start a step!`);
      return;
    }

    return this.addStepToItem(result, uuid, parent);
  };

  updateStep = (updateFunc: (stepResult: StepResult) => void, uuid?: string) => {
    const stepUuid = this.contextProvider.getStep(uuid);
    if (!stepUuid) {
      this.logMissingStepRoot(uuid, "update");
      return;
    }

    const step = this.state.getStep(stepUuid)!;
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`No step ${stepUuid} to update!`);
      return;
    }

    updateFunc(step);
  };

  stopStep = ({ uuid, stop }: StopOpts = {}) => {
    const stepUuid = this.contextProvider.getStep(uuid);
    if (!stepUuid) {
      this.logMissingStepRoot(uuid, "stop");
      return;
    }

    const step = this.state.getStep(stepUuid);
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`No step ${stepUuid} to stop!`);
      return;
    }

    this.notifier.beforeStepStop(step);

    step.stop = stop ?? Date.now();
    step.stage = Stage.FINISHED;

    this.state.deleteStepResult(stepUuid);
    this.contextProvider.removeStep(uuid);

    this.notifier.afterStepStop(step);
  };

  buildAttachmentFileName = (options: AttachmentOptions): string => {
    const attachmentUuid = this.crypto.uuid();
    const attachmentExtension = typeToExtension({
      fileExtension: options.fileExtension,
      contentType: options.contentType,
    });

    return `${attachmentUuid}-attachment${attachmentExtension}`;
  };

  writeAttachment = (attachment: RawAttachment, uuid?: string) => {
    const targetUuid = this.contextProvider.getExecutingItem(uuid);
    if (!targetUuid) {
      this.logMissingStepRoot(uuid, "attach");
      return;
    }

    const targetResult = this.state.getExecutionItem(targetUuid);
    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test, fixture, or step ${targetUuid} to attach!`);
      return;
    }

    this.writeAttachmentForItem(attachment, targetResult);
  };

  /* TODO: Add executors.json */

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

  applyRuntimeMessages = <T>(
    messages: Messages<T>[] = [],
    { testUuid, fixtureUuid, customHandler }: ApplyMessagesOpts<T> = {},
  ) => {
    const resolvedTestUuid = testUuid ?? this.contextProvider.getTest();
    const resolvedFixtureUuid = fixtureUuid ?? this.contextProvider.getFixture();
    const resolvedRootUuid = resolvedFixtureUuid ?? resolvedTestUuid ?? this.contextProvider.getStepRoot();

    if (!resolvedRootUuid) {
      // eslint-disable-next-line no-console
      console.error("No current fixture or test to apply runtime messages to!");
      return;
    }

    const fixture = resolvedFixtureUuid ? this.state.getFixture(resolvedFixtureUuid) : undefined;
    const test = resolvedTestUuid ? this.state.getTest(resolvedTestUuid) : undefined;
    const root = fixture ?? test;

    if (!root) {
      // eslint-disable-next-line no-console
      console.error(`No fixture or test (${resolvedRootUuid}) to apply runtime messages to!`);
      return;
    }

    const targets: MessageTargets = {
      fixtureUuid: resolvedFixtureUuid ?? undefined,
      fixture,
      testUuid: resolvedTestUuid ?? undefined,
      test,
      rootUuid: resolvedRootUuid,
      root,
    };

    for (const message of messages) {
      const step = this.getCurrentStep(resolvedRootUuid);

      targets.step = step;

      const unhandledMessage = this.handleBuiltInMessage(message, targets);

      if (unhandledMessage && customHandler) {
        customHandler(unhandledMessage, fixture, test, step);
      }
    }
  };

  protected createTestResult(result: Partial<TestResult>): TestResult {
    const uuid = this.crypto.uuid();
    return {
      ...createTestResult(uuid),
      start: Date.now(),
      ...deepClone(result),
    };
  }

  protected getWellKnownWriters() {
    return wellKnownCommonWriters as WellKnownWriters;
  }

  private handleBuiltInMessage = <T>(message: Messages<T>, targets: MessageTargets) => {
    switch (message.type) {
      case "metadata":
        this.handleMetadataMessage(message as RuntimeMetadataMessage, targets);
        return;
      case "step_start":
        this.handleStepStartMessage(message as RuntimeStartStepMessage, targets);
        return;
      case "step_metadata":
        this.handleStepMetadataMessage(message as RuntimeStepMetadataMessage, targets);
        return;
      case "step_stop":
        this.handleStepStopMessage(message as RuntimeStopStepMessage, targets);
        return;
      case "raw_attachment":
        this.handleRawAttachmentMessage(message as RuntimeRawAttachmentMessage, targets);
        return;
      default:
        return message as Exclude<Messages<T>, RuntimeMessage>;
    }
  };

  private handleMetadataMessage = (message: RuntimeMetadataMessage, { test, root, step }: MessageTargets) => {
    const { links = [], attachments = [], displayName, parameters = [], labels = [], ...rest } = message.data;
    const formattedLinks = this.formatLinks(links);

    if (displayName) {
      root.name = displayName;
    }

    if (test) {
      test.links = test.links.concat(formattedLinks);
      test.labels = test.labels.concat(labels);
      test.parameters = test.parameters.concat(parameters);
      Object.assign(test, rest);
    }

    const attachmentTarget = step || root;
    attachmentTarget.attachments = attachmentTarget.attachments.concat(attachments);
  };

  private handleStepStartMessage = (message: RuntimeStartStepMessage, { rootUuid, root, step }: MessageTargets) =>
    this.addStepToItem({ ...message.data }, rootUuid, step ?? root);

  private handleStepMetadataMessage = (message: RuntimeStepMetadataMessage, { rootUuid, step }: MessageTargets) => {
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`No current step of ${rootUuid} to apply the metadata`);
      return;
    }
    const { name, parameters } = message.data;
    if (name) {
      step.name = name;
    }
    if (parameters?.length) {
      step.parameters = step.parameters.concat(parameters);
    }
  };

  private handleStepStopMessage = (message: RuntimeStopStepMessage, { rootUuid, step }: MessageTargets) => {
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`No current step of ${rootUuid} to stop`);
      return;
    }

    const { status, stage, stop, ...rest } = message.data;

    // we should not override the status and stage if they are already set
    if (step.status === undefined) {
      step.status = status;
    }

    if (step.stage === undefined) {
      step.stage = stage;
    }

    Object.assign(step, rest);

    this.stopStep({ uuid: rootUuid, stop });
  };

  private handleRawAttachmentMessage = (message: RuntimeRawAttachmentMessage, { root, step }: MessageTargets) => {
    this.writeAttachmentForItem(message.data, step ?? root);
  };

  private writeAttachmentForItem = (attachment: RawAttachment, item: StepResult | TestResult | FixtureResult) => {
    const attachmentFilename = this.buildAttachmentFileName(attachment);

    this.writer.writeAttachment(
      attachmentFilename,
      attachment.content,
      (attachment.encoding as BufferEncoding) || "base64",
    );

    const rawAttachment = {
      name: attachment.name,
      source: attachmentFilename,
      type: attachment.contentType,
    };

    item.attachments.push(rawAttachment);
  };

  private startScopeWithUuid = (uuid: string, { manual, parent }: StartScopeOpts = {}) => {
    const newScope = this.state.setScope(uuid);

    if (!manual) {
      parent = this.contextProvider.getScope() ?? undefined;
      this.contextProvider.addScope(uuid);
    }
    if (parent) {
      const parentScope = this.state.getScope(parent);
      if (parentScope) {
        this.linkScopes(parentScope, newScope);
      }
    }
    return uuid;
  };

  private resolveScope = (scopeUuid: string | undefined | null) => {
    if (scopeUuid === null) {
      return null;
    }
    scopeUuid = scopeUuid ?? this.contextProvider.getScope();
    return scopeUuid ? this.state.getScope(scopeUuid) : null;
  };

  private removeScopeFromParent = (scope: TestScope) => {
    const { subScopes } = scope.parent ?? {};
    if (subScopes) {
      const scopeIndex = subScopes.indexOf(scope);
      if (scopeIndex !== -1) {
        subScopes.splice(scopeIndex, 1);
      }
    }
  };

  private removeFixtureFromScope = ({ fixtures }: TestScope, wrappedFixture: FixtureWrapper) => {
    const fixtureIndex = fixtures.indexOf(wrappedFixture);
    if (fixtureIndex !== -1) {
      fixtures.splice(fixtureIndex, 1);
    }
  };

  private setUpFixtureDedicatedScope = (
    wrappedFixture: FixtureWrapper,
    tests: readonly string[] | undefined,
    parentScope?: TestScope | null,
  ) => {
    const scope = this.state.setScope(wrappedFixture.uuid, {
      fixtures: [wrappedFixture],
      tests: [...(tests ?? [])],
    });
    wrappedFixture.scope = scope;
    if (parentScope) {
      this.linkScopes(parentScope, scope);
    }
  };

  private linkScopes = (parent: TestScope, child: TestScope) => {
    child.parent = parent;
    parent.subScopes.push(child);
  };

  private linkFixturesToScope = (
    wrappedFixtures: readonly FixtureWrapper[],
    scope: TestScope,
    extraTests: readonly string[] | undefined,
  ) => {
    for (const fixture of wrappedFixtures) {
      this.linkFixtureToScope(fixture, scope, extraTests);
    }
  };

  private linkFixtureToScope = (
    wrappedFixture: FixtureWrapper,
    scope: TestScope,
    extraTests: readonly string[] | undefined,
  ) => {
    if (wrappedFixture.scope) {
      const fixtureIndex = wrappedFixture.scope.fixtures.indexOf(wrappedFixture);
      if (fixtureIndex !== -1) {
        wrappedFixture.scope.fixtures.splice(fixtureIndex, 1);
      }
    }

    wrappedFixture.scope = scope;
    scope.fixtures.push(wrappedFixture);
    if (extraTests) {
      this.linkTestsToScope(scope, extraTests);
    }
  };

  private stopFixtureObj = (fixture: FixtureResult, uuid?: string, stop?: number) => {
    fixture.stop = stop ?? Date.now();
    fixture.stage = Stage.FINISHED;

    this.contextProvider.removeFixture(uuid);
  };

  private writeAllFixturesOfScope = (root: TestScope) => {
    const stack = [root];
    for (let scope = stack.pop(); scope; scope = stack.pop()) {
      this.writeFixturesOfScope(scope);
      this.state.deleteScope(scope.uuid);
    }
  };

  private writeFixturesOfScope = ({ fixtures, tests }: TestScope) => {
    const writtenFixtures = new Set<string>();
    if (tests.length) {
      for (const wrappedFixture of fixtures) {
        if (!writtenFixtures.has(wrappedFixture.uuid)) {
          this.writeContainer(tests, wrappedFixture);
          this.state.deleteFixtureResult(wrappedFixture.uuid);
          writtenFixtures.add(wrappedFixture.uuid);
        }
      }
    }
  };

  private writeContainer = (tests: string[], wrappedFixture: FixtureWrapper) => {
    const fixture = wrappedFixture.value;
    const befores = wrappedFixture.type === "before" ? [wrappedFixture.value] : [];
    const afters = wrappedFixture.type === "after" ? [wrappedFixture.value] : [];
    this.writer.writeGroup({
      uuid: this.crypto.uuid(),
      name: fixture.name,
      children: [...new Set(tests)],
      befores,
      afters,
    });
  };

  private addStepToItem = (
    data: Partial<StepResult>,
    rootUuid: string | undefined,
    parent: StepResult | TestResult | FixtureResult,
  ) => {
    const stepResult: StepResult = {
      ...createStepResult(),
      start: Date.now(),
      ...data,
    };
    parent.steps.push(stepResult);
    const stepUuid = this.crypto.uuid();
    this.state.setStepResult(stepUuid, stepResult);

    this.contextProvider.addStep(stepUuid, rootUuid);

    return stepUuid;
  };

  private logMissingStepRoot = (uuid: string | undefined, op: string) => {
    if (uuid) {
      // eslint-disable-next-line no-console
      console.error(`No test or fixture of (${uuid}) to ${op} the step!`);
    } else {
      // eslint-disable-next-line no-console
      console.error(`No current step to ${op}!`);
    }
  };

  private formatLinks = (links: Link[]) => {
    if (!this.links.length) {
      return links;
    }

    return links.map((link) => {
      // TODO:
      // @ts-ignore
      const matcher = this.links?.find?.(({ type }) => type === link.type);

      // TODO:
      if (!matcher || link.url.startsWith("http")) {
        return link;
      }

      const url = matcher.urlTemplate.replace("%s", link.url);

      // we shouldn't need to reassign already assigned name
      if (link.name || !matcher.nameTemplate) {
        return {
          ...link,
          url,
        };
      }

      const name = matcher.nameTemplate.replace("%s", link.url);

      return {
        ...link,
        name,
        url,
      };
    });
  };

  private introduceTestIntoScopes = (testUuid: string, scopeUuid: string) => {
    const scope = this.state.getScope(scopeUuid);
    if (!scope) {
      // eslint-disable-next-line no-console
      console.error(`No scope ${scopeUuid} to introduce the test into`);
      return;
    }

    this.linkTestsToScope(scope, [testUuid]);
  };

  private linkTestsToScope = (scope: TestScope, testUuids: readonly string[]) => {
    for (let curScope: TestScope | undefined = scope; curScope; curScope = curScope.parent) {
      curScope.tests.splice(curScope.tests.length, 0, ...testUuids);
    }
  };
}
