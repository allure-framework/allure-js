/* eslint max-lines: 0 */
import {
  AttachmentOptions,
  Category,
  EnvironmentInfo,
  Link,
  Messages,
  RawAttachment,
  RuntimeMessage,
  RuntimeMetadataMessage,
  RuntimeRawAttachmentMessage,
  RuntimeStartStepMessage,
  RuntimeStepMetadataMessage,
  RuntimeStopStepMessage,
  StepResult,
  TestResult,
  TestResultContainer,
  FixtureResult,
  Stage,
} from "../model.js";
import { deepClone, typeToExtension } from "../utils.js";
import { Config, LinkConfig } from "./Config.js";
import { Crypto } from "./Crypto.js";
import { Notifier } from "./LifecycleListener.js";
import { LifecycleState } from "./LifecycleState.js";
import { AllureContextProvider, StaticContextProvider, MutableAllureContext, MutableAllureContextBox } from "./context/index.js";
import { Writer } from "./Writer.js";
import {
  createStepResult,
  createTestResult,
  createFixtureResult,
  getTestResultHistoryId,
  getTestResultTestCaseId,
} from "./utils.js";

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
    contextProvider = StaticContextProvider.wrap(new MutableAllureContextBox()),
  }: Config & {
    crypto: Crypto;
  }) {
    this.writer = writer;
    this.notifier = new Notifier({ listeners });
    this.crypto = crypto;
    this.links = links;
    this.categories = categories;
    this.environmentInfo = environmentInfo;
    this.contextProvider = contextProvider;
  }

  hasContainer = () => !!this.contextProvider.getContainer();
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

  getCurrentStep = () => {
    const stepUuid = this.contextProvider.getStep();
    return stepUuid ? this.state.getStep(stepUuid) : undefined;
  };

  getCurrentStepOf = (scope: string) => {
    const stepUuid = this.contextProvider.getStepOfScope(scope);
    return stepUuid ? this.state.getStep(stepUuid) : undefined;
  };

  getCurrentExecutable = () => {
    const uuid = this.contextProvider.getExecutionItem();
    return uuid ? this.state.getExecutionItem(uuid) : undefined;
  };

  getCurrentExecutableOf = (scope: string) => {
    const uuid = this.contextProvider.getExecutionItemByScope(scope);
    return uuid ? this.state.getExecutionItem(uuid) : undefined;
  };


  startContainer = (resultContainer: Partial<TestResultContainer>) => {
    const uuid = this.crypto.uuid();
    this.state.setTestContainer(uuid, resultContainer);
    this.contextProvider.addContainer(uuid);
    return uuid;
  };

  updateContainer = (uuid: string, updateFunc: (result: TestResultContainer) => void) => {
    const container = this.state.testContainers.get(uuid);

    if (!container) {
      // eslint-disable-next-line no-console
      console.error(`No test container (${uuid}) to update!`);
      return;
    }

    updateFunc(container);
  };

  updateCurrentContainer = (updateFunc: (result: TestResultContainer) => void) => {
    const containerUuid = this.contextProvider.getContainer();
    if (!containerUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test container to update!");
      return;
    }
    this.updateContainer(containerUuid, updateFunc);
  };

  writeContainer = (uuid: string) => {
    this.writeStoredContainer(uuid);
    this.contextProvider.removeContainerByUuid(uuid);
  };

  writeCurrentContainer = () => {
    const containerUuid = this.contextProvider.getContainer();
    if (!containerUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test container to update!");
      return;
    }
    this.writeStoredContainer(containerUuid);
    this.contextProvider.removeContainer();
  };

  startBeforeFixture = (containerUuid: string, fixtureResult: Partial<FixtureResult>, start?: number) =>
    this.startFixtureInContainer(containerUuid, fixtureResult, start, (c, f) => c.befores.push(f));

  startAfterFixture = (containerUuid: string, fixtureResult: Partial<FixtureResult>, start?: number) =>
    this.startFixtureInContainer(containerUuid, fixtureResult, start, (c, f) => c.afters.push(f));

  startBeforeFixtureInCurrentContainer = (fixtureResult: Partial<FixtureResult>, start?: number) =>
    this.startFixtureInCurrentContainer(fixtureResult, start, (c, f) => c.befores.push(f));

  startAfterFixtureInCurrentContainer = (fixtureResult: Partial<FixtureResult>, start?: number) =>
    this.startFixtureInCurrentContainer(fixtureResult, start, (c, f) => c.afters.push(f));

  updateFixture = (uuid: string, updateFunc: (result: FixtureResult) => void) => {
    const fixture = this.state.fixturesResults.get(uuid);

    if (!fixture) {
      // eslint-disable-next-line no-console
      console.error(`No fixture (${uuid}) to update!`);
      return;
    }

    updateFunc(fixture);
  };

  updateCurrentFixture = (updateFunc: (result: FixtureResult) => void) => {
    const fixtureUuid = this.contextProvider.getFixture();
    if (!fixtureUuid) {
      // eslint-disable-next-line no-console
      console.error("No current fixture to update!");
      return;
    }

    this.updateFixture(fixtureUuid, updateFunc);
  };

  stopFixture = (uuid: string, stop?: number) => {
    this.stopStoredFixture(uuid, stop);
    this.contextProvider.removeFixtureByUuid(uuid);
  };

  stopCurrentFixture = (stop?: number) => {
    const fixtureUuid = this.contextProvider.getFixture();
    if (!fixtureUuid) {
      // eslint-disable-next-line no-console
      console.error("No current fixtures to stop!");
      return;
    }
    this.stopStoredFixture(fixtureUuid, stop);
    this.contextProvider.removeFixture();
  };

  start = (result: Partial<TestResult>, start?: number) => {
    const stateObject = this.createTestResult(result, start);
    const uuid = stateObject.uuid;

    this.notifier.beforeTestResultStart(stateObject);
    this.state.setTestResult(uuid, stateObject);
    this.notifier.afterTestResultStart(stateObject);

    this.contextProvider.setTest(uuid);
    this.insertTestToCurrentContainers(uuid);

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
   * @param uuid - test result uuid
   * @param updateFunc - function that updates test result; result passes as a single argument and should be mutated to apply changes
   */
  update = (uuid: string, updateFunc: (result: TestResult) => void) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to update!`);
      return;
    }

    this.notifier.beforeTestResultUpdate(targetResult);
    updateFunc(targetResult);
    this.notifier.afterTestResultUpdate(targetResult);
  };

  updateCurrentTest = (updateFunc: (result: TestResult) => void) => {
    const testUuid = this.contextProvider.getTest();
    if (!testUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test to update!");
      return;
    }
    this.update(testUuid, updateFunc);
  };

  stop = (uuid: string, stop?: number) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to stop!`);
      return;
    }

    this.notifier.beforeTestResultStop(targetResult);
    targetResult.testCaseId ??= getTestResultTestCaseId(this.crypto, targetResult);
    targetResult.historyId ??= getTestResultHistoryId(this.crypto, targetResult);
    targetResult.stop = stop || Date.now();

    this.notifier.afterTestResultStop(targetResult);
  };

  stopCurrentTest = (stop?: number) => {
    const testUuid = this.contextProvider.getTest();
    if (!testUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test to stop!");
      return;
    }
    this.stop(testUuid, stop);
  };

  startStep = (uuid: string, result: Partial<StepResult>, start?: number) => {
    const parentUuid = this.contextProvider.getExecutionItemByScope(uuid);

    const stepUuid = this.addStepTo(parentUuid, result, start);
    if (stepUuid) {
      this.contextProvider.addStepToScope(uuid, stepUuid);
    }
  };

  startStepInCurrentScope = (result: Partial<StepResult>, start?: number) => {
    const parentUuid = this.contextProvider.getExecutionItem();
    if (!parentUuid) {
      // eslint-disable-next-line no-console
      console.error("No current step, fixture, or test to start a new step!");
      return;
    }
    const stepUuid = this.addStepTo(parentUuid, result, start);

    if (stepUuid) {
      this.contextProvider.addStep(stepUuid);
    }
  };

  updateStep = (uuid: string, updateFunc: (stepResult: StepResult) => void) => {
    const stepUuid = this.contextProvider.getStepOfScope(uuid);
    if (!stepUuid) {
      // eslint-disable-next-line no-console
      console.error(`No test or fixture (${uuid}) to update step!`);
      return;
    }
    this.updateStoredStep(stepUuid, updateFunc);
  };

  updateCurrentStep = (updateFunc: (stepResult: StepResult) => void) => {
    const stepUuid = this.contextProvider.getStep();
    if (!stepUuid) {
      // eslint-disable-next-line no-console
      console.error("No current step to update!");
      return;
    }
    this.updateStoredStep(stepUuid, updateFunc);
  };

  stopStep = (uuid: string, stop?: number) => {
    const stepUuid = this.contextProvider.getStepOfScope(uuid);
    if (!stepUuid) {
      // eslint-disable-next-line no-console
      console.error(`No test or fixture (${uuid}) to stop step!`);
      return;
    }
    this.stopStoredStep(stepUuid, stop);
    this.contextProvider.removeStepFromScope(uuid);
  };

  stopCurrentStep = (stop?: number) => {
    const stepUuid = this.contextProvider.getStep();
    if (!stepUuid) {
      // eslint-disable-next-line no-console
      console.error("No current step to stop!");
      return;
    }
    this.stopStoredStep(stepUuid, stop);
    this.contextProvider.removeStep();
  };

  write = (uuid: string) => {
    this.writeStoredTest(uuid);
    this.contextProvider.removeTestByUuid(uuid);
  };

  writeCurrentTest = () => {
    const testUuid = this.contextProvider.getTest();
    if (!testUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test to write!");
      return;
    }
    this.writeStoredTest(testUuid);
    this.contextProvider.removeTest();
  };

  buildAttachmentFileName = (options: AttachmentOptions): string => {
    const attachmentUuid = this.crypto.uuid();
    const attachmentExtension = options.fileExtension || typeToExtension({ contentType: options.contentType });

    return `${attachmentUuid}-attachment${attachmentExtension}`;
  };

  writeAttachment = (uuid: string, attachment: RawAttachment) => {
    const targetUuid = this.contextProvider.getExecutionItemByScope(uuid);
    if (!targetUuid) {
      // eslint-disable-next-line no-console
      console.error(`No test or fixture ${uuid} to attach!`);
      return;
    }
    this.writeAttachmentOfStoredItem(targetUuid, attachment);
  };

  writeAttachmentToCurrentItem = (attachment: RawAttachment) => {
    const targetUuid = this.contextProvider.getExecutionItem();
    if (!targetUuid) {
      // eslint-disable-next-line no-console
      console.error("No current test, fixture, or step to attach!");
      return;
    }
    this.writeAttachmentOfStoredItem(targetUuid, attachment);
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
    uuid: string,
    messages: Messages<T>[] = [],
    customMessageHandler?: (
      message: Exclude<Messages<T>, RuntimeMessage>,
      fixture?: FixtureResult,
      test?: TestResult,
      step?: StepResult,
    ) => void | Promise<void>,
  ) => {
    const fixture = this.state.getFixture(uuid);
    const test = this.state.getTest(uuid);

    if (!fixture && !test) {
      // eslint-disable-next-line no-console
      console.error(`No fixture or test (${uuid}) to apply runtime messages to!`);
      return;
    }

    for (const message of messages) {
      const step = this.getCurrentStepOf(uuid);
      const unhandledMessage = this.handleScopedBuiltInMessage(uuid, message);
      if (unhandledMessage) {
        customMessageHandler?.(unhandledMessage, fixture, test, step);
      }
    }
  };

  applyRuntimeMessagesToCurrentScope = <T>(
    messages: Messages<T>[] = [],
    customMessageHandler?: (
      message: Exclude<Messages<T>, RuntimeMessage>,
      fixture?: FixtureResult,
      test?: TestResult,
      step?: StepResult,
    ) => void | Promise<void>,
  ) => {
    const fixture = this.getCurrentFixture();
    const test = this.getCurrentTest();

    if (!fixture && !test) {
      // eslint-disable-next-line no-console
      console.error("No current fixture or test to apply runtime messages to!");
      return;
    }

    for (const message of messages) {
      const step = this.getCurrentStep();
      const unhandledMessage = this.handleBuiltInMessage(message);
      if (unhandledMessage) {
        customMessageHandler?.(unhandledMessage, fixture, test, step);
      }
    }
  };

  protected createTestResult(result: Partial<TestResult>, start?: number): TestResult {
    const uuid = this.crypto.uuid();
    return {
      ...createTestResult(uuid),
      ...deepClone(result),
      start: start || Date.now(),
    };
  }

  private startFixtureInContainer = (
    containerUuid: string,
    fixtureResult: Partial<FixtureResult>,
    start: number | undefined,
    updateFn: (container: TestResultContainer, fixture: FixtureResult) => void,
  ) =>
    this.startFixture(fixtureResult, start, (f) => this.updateContainer(containerUuid, (c) => updateFn(c, f)));

  private startFixtureInCurrentContainer = (
    fixtureResult: Partial<FixtureResult>,
    start: number | undefined,
    updateFn: (container: TestResultContainer, fixture: FixtureResult) => void,
  ) =>
    this.startFixture(fixtureResult, start, (f) => this.updateCurrentContainer((c) => updateFn(c, f)));

  private startFixture = (
    fixtureResult: Partial<FixtureResult>,
    start: number | undefined,
    addToContainer: (fixture: FixtureResult) => void,
  ) => {
    const uuid = this.crypto.uuid();
    const fixture: FixtureResult = {
      ...createFixtureResult(),
      ...fixtureResult,
    };
    start = start ?? Date.now();
    addToContainer(fixture);
    this.state.setFixtureResult(uuid, fixture);
    this.contextProvider.setFixture(uuid);
    return uuid;
  };

  private writeStoredContainer = (uuid: string) => {
    const container = this.state.testContainers.get(uuid);

    if (!container) {
      // eslint-disable-next-line no-console
      console.error(`No test container (${uuid}) to update!`);
      return;
    }

    this.writer.writeGroup(container);
    this.state.deleteTestContainer(uuid);
  };

  private stopStoredFixture = (fixtureUuid: string, stop: number | undefined) => {
    const fixture = this.state.fixturesResults.get(fixtureUuid);

    if (!fixture) {
      // eslint-disable-next-line no-console
      console.error(`No fixtures (${fixtureUuid}) to stop!`);
      return;
    }

    fixture.stop = stop || Date.now();
    fixture.stage = Stage.FINISHED;
    this.state.deleteFixtureResult(fixtureUuid);
  };

  private addStepTo = (parentUuid: string, result: Partial<StepResult>, start: number | undefined) => {
    const parent = this.state.getExecutionItem(parentUuid);
    if (!parent) {
      // eslint-disable-next-line no-console
      console.error(`No execution item (${parentUuid}) to start step!`);
      return;
    }
    const stepResult: StepResult = {
      ...createStepResult(),
      start: start || Date.now(),
      ...result,
    };
    parent.steps.push(stepResult);
    const stepUuid = this.crypto.uuid();
    this.state.setStepResult(stepUuid, stepResult);
    return stepUuid;
  };

  private updateStoredStep = (stepUuid: string, updateFunc: (stepResult: StepResult) => void) => {
    const currentStep = this.state.getStep(stepUuid)!;

    if (!currentStep) {
      // eslint-disable-next-line no-console
      console.error(`No step ${stepUuid}`);
      return;
    }

    updateFunc(currentStep);
  };

  private stopStoredStep = (stepUuid: string, stop: number | undefined) => {
    const stepResult = this.state.getStep(stepUuid);
    if (!stepResult) {
      // eslint-disable-next-line no-console
      console.error(`No step ${stepUuid}`);
      return;
    }

    this.notifier.beforeStepStop(stepResult);
    stepResult.stop = stop ?? Date.now();
    stepResult.stage = Stage.FINISHED;
    this.notifier.afterStepStop(stepResult);

    this.state.deleteStepResult(stepUuid);
  };

  private writeAttachmentOfStoredItem = (targetUuid: string, attachment: RawAttachment) => {
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

    const executionItem = this.state.getExecutionItem(targetUuid);
    if (!executionItem) {
      // eslint-disable-next-line no-console
      console.error(`No test, fixture, or step ${targetUuid} to attach!`);
      return;
    }

    executionItem.attachments.push(rawAttachment);
  };

  private writeStoredTest = (uuid: string) => {
    const targetResult = this.state.testResults.get(uuid);
    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test (${uuid}) to write!`);
      return;
    }

    this.notifier.beforeTestResultWrite(targetResult);
    this.writer.writeResult(targetResult);
    this.notifier.afterTestResultWrite(targetResult);
    this.state.deleteTestResult(uuid);
  };

  private handleBuiltInMessage = <T>(message: Messages<T>) => {
    switch (message.type) {
      case "metadata":
        this.handleMetadataMessage(message as RuntimeMetadataMessage);
        return;
      case "step_start":
        this.handleStepStartMessage(message as RuntimeStartStepMessage);
        return;
      case "step_metadata":
        this.handleStepMetadataMessage(message as RuntimeStepMetadataMessage);
        return;
      case "step_stop":
        this.handleStepStopMessage(message as RuntimeStopStepMessage);
        return;
      case "raw_attachment":
        this.handleRawAttachmentMessage(message as RuntimeRawAttachmentMessage);
      default:
        return message as Exclude<Messages<T>, RuntimeMessage>;
    }
  };

  private handleScopedBuiltInMessage = <T>(scopeUuid: string, message: Messages<T>) => {
    switch (message.type) {
      case "metadata":
        this.handleMetadataMessageOf(scopeUuid, message as RuntimeMetadataMessage);
        return;
      case "step_start":
        this.handleStepStartMessageOf(scopeUuid, message as RuntimeStartStepMessage);
        return;
      case "step_metadata":
        this.handleStepMetadataMessageOf(scopeUuid, message as RuntimeStepMetadataMessage);
        return;
      case "step_stop":
        this.handleStepStopMessageOf(scopeUuid, message as RuntimeStopStepMessage);
        return;
      case "raw_attachment":
        this.handleRawAttachmentMessageOf(scopeUuid, message as RuntimeRawAttachmentMessage);
      default:
        return message as Exclude<Messages<T>, RuntimeMessage>;
    }
  };

  private handleMetadataMessageOf = (scopeUuid: string, message: RuntimeMetadataMessage) => {
    const fixture = this.state.getFixture(scopeUuid);
    const test = this.state.getTest(scopeUuid);
    if (!fixture && !test) {
      // eslint-disable-next-line no-console
      console.error(`No fixture or test ${scopeUuid} to apply the metadata to!`);
      return;
    }
    const step = this.getCurrentStepOf(scopeUuid);
    this.applyMetadataMessage(message, fixture, test, step);
  };

  private handleMetadataMessage = (message: RuntimeMetadataMessage) => {
    const fixture = this.getCurrentFixture();
    const test = this.getCurrentTest();
    if (!fixture && !test) {
      // eslint-disable-next-line no-console
      console.error("No current fixture or test to apply the metadata to!");
      return;
    }
    const step = this.getCurrentStep();
    this.applyMetadataMessage(message, fixture, test, step);
  };

  private applyMetadataMessage = (
    message: RuntimeMetadataMessage,
    fixture: FixtureResult | undefined,
    test: TestResult | undefined,
    step: StepResult | undefined,
  ) => {
    const target = (fixture || test)!;
    const attachmentTarget = step || target;
    const {
      links = [],
      attachments = [],
      displayName,
      parameters = [],
      labels = [],
      ...rest
    } = message.data;
    const formattedLinks = this.formatLinks(links);

    if (displayName) {
      target.name = displayName;
    }

    if (test) {
      test.links = test.links.concat(formattedLinks);
      test.labels = test.labels.concat(labels);
      test.parameters = test.parameters.concat(parameters);
      Object.assign(test, rest);
    }

    attachmentTarget.attachments = attachmentTarget.attachments.concat(attachments);
  };

  private handleStepStartMessageOf = (scopeUuid: string, message: RuntimeStartStepMessage) => {
    const { name, start } = message.data;
    this.startStep(scopeUuid, { name }, start);
  };

  private handleStepStartMessage = (message: RuntimeStartStepMessage) => {
    const { name, start } = message.data;
    this.startStepInCurrentScope({ name }, start);
  };

  private handleStepMetadataMessageOf = (scopeUuid: string, message: RuntimeStepMetadataMessage) => {
    const step = this.getCurrentStepOf(scopeUuid);
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`No current step of ${scopeUuid} to apply the metadata`);
      return;
    }
    this.applyStepMetadataMessage(message, step);
  };

  private handleStepMetadataMessage = (message: RuntimeStepMetadataMessage) => {
    const step = this.getCurrentStep();
    if (!step) {
      // eslint-disable-next-line no-console
      console.error("No current step of to apply the metadata");
      return;
    }
    this.applyStepMetadataMessage(message, step);
  };

  private applyStepMetadataMessage = (message: RuntimeStepMetadataMessage, step: StepResult) => {
    const { name, parameters } = message.data;
    if (name) {
      step.name = name;
    }
    if (parameters?.length) {
      step.parameters = step.parameters.concat(parameters);
    }
  };

  private handleStepStopMessageOf = (scopeUuid: string, message: RuntimeStopStepMessage) => {
    const step = this.getCurrentStepOf(scopeUuid);
    if (!step) {
      // eslint-disable-next-line no-console
      console.error(`No current step of ${scopeUuid} to stop`);
      return;
    }
    const { stop, ...rest } = message.data;
    Object.assign(step, rest);
    this.stopStep(scopeUuid, stop);
  };

  private handleStepStopMessage = (message: RuntimeStopStepMessage) => {
    const step = this.getCurrentStep();
    if (!step) {
      // eslint-disable-next-line no-console
      console.error("No current step to stop");
      return;
    }
    const { stop, ...rest } = message.data;
    Object.assign(step, rest);
    this.stopCurrentStep(stop);
  };

  private handleRawAttachmentMessageOf = (uuid: string, message: RuntimeRawAttachmentMessage) => {
    this.writeAttachment(uuid, message.data);
  };

  private handleRawAttachmentMessage = (message: RuntimeRawAttachmentMessage) => {
    this.writeAttachmentToCurrentItem(message.data);
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

      return {
        ...link,
        url,
      };
    });
  };

  private insertTestToCurrentContainers = (testUuid: string) => {
    for (const containerUuid of this.contextProvider.getContainerStack()) {
      if (containerUuid) {
        const container = this.state.testContainers.get(containerUuid);
        container?.children.push(testUuid);
      }
    }
  };
}
