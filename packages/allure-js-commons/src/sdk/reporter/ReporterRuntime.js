var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _ShallowStepsStack_instances, _ShallowStepsStack_runningSteps, _ShallowStepsStack_currentStep_get, _ReporterRuntime_handleMetadataMessage, _ReporterRuntime_handleStepMetadataMessage, _ReporterRuntime_handleStartStepMessage, _ReporterRuntime_handleStopStepMessage, _ReporterRuntime_handleAttachmentContentMessage, _ReporterRuntime_handleAttachmentPathMessage, _ReporterRuntime_findParent, _ReporterRuntime_writeFixturesOfScope, _ReporterRuntime_writeContainer, _ReporterRuntime_calculateTimings;
/* eslint max-lines: 0 */
import path from "node:path";
import { extname } from "path";
import { Stage, } from "../../model.js";
import { LifecycleState } from "./LifecycleState.js";
import { Notifier } from "./Notifier.js";
import { createFixtureResult, createStepResult, createTestResult } from "./factory.js";
import { hasSkipLabel } from "./testplan.js";
import { deepClone, formatLinks, getTestResultHistoryId, getTestResultTestCaseId, randomUuid } from "./utils.js";
import { buildAttachmentFileName } from "./utils/attachments.js";
import { resolveWriter } from "./writer/loader.js";
/**
 * Simpler steps stack implementation that contains only the current steps without root nodes
 * Useful, when you need to create steps without binding them to a specific test or fixture
 * @example
 * ```js
 * const stack = new ShallowStepsStack();
 *
 * stack.startStep({ name: "step 1" });
 * stack.startStep({ name: "step 1.1" });
 * stack.stopStep({ status: Status.FAILED });
 * stack.stopStep({ status: Status.PASSED });
 * stack.steps // => [{ name: "step 1", status: Status.PASSED, steps: [{ name: "step 1.1", status: Status.FAILED }] }]
 * ```
 */
export class ShallowStepsStack {
    constructor() {
        _ShallowStepsStack_instances.add(this);
        this.steps = [];
        _ShallowStepsStack_runningSteps.set(this, []);
    }
    currentStep() {
        return __classPrivateFieldGet(this, _ShallowStepsStack_instances, "a", _ShallowStepsStack_currentStep_get);
    }
    startStep(step) {
        const stepResult = {
            ...createStepResult(),
            ...step,
        };
        if (__classPrivateFieldGet(this, _ShallowStepsStack_instances, "a", _ShallowStepsStack_currentStep_get)) {
            __classPrivateFieldGet(this, _ShallowStepsStack_instances, "a", _ShallowStepsStack_currentStep_get).steps.push(stepResult);
        }
        else {
            this.steps.push(stepResult);
        }
        __classPrivateFieldGet(this, _ShallowStepsStack_runningSteps, "f").push(stepResult);
    }
    updateStep(updateFunc) {
        if (!__classPrivateFieldGet(this, _ShallowStepsStack_instances, "a", _ShallowStepsStack_currentStep_get)) {
            // eslint-disable-next-line no-console
            console.error("There is no running step in the stack to update!");
            return;
        }
        updateFunc(__classPrivateFieldGet(this, _ShallowStepsStack_instances, "a", _ShallowStepsStack_currentStep_get));
    }
    stopStep(opts) {
        if (!__classPrivateFieldGet(this, _ShallowStepsStack_instances, "a", _ShallowStepsStack_currentStep_get)) {
            // eslint-disable-next-line no-console
            console.error("There is no running step in the stack to stop!");
            return;
        }
        const { stop, duration = 0 } = opts ?? {};
        this.updateStep((result) => {
            result.stop = (stop ?? result.start) ? result.start + duration : undefined;
        });
        __classPrivateFieldGet(this, _ShallowStepsStack_runningSteps, "f").pop();
    }
    findStepByUuid(uuid) {
        const findRecursively = (steps) => {
            for (const s of steps) {
                if (s.uuid === uuid) {
                    return s;
                }
                const found = findRecursively(s.steps);
                if (found) {
                    return found;
                }
            }
            return undefined;
        };
        return findRecursively(this.steps);
    }
    addAttachment(attachment, writer) {
        const isPath = !!attachment.path;
        const fileExt = attachment.path ? path.extname(attachment.path) : undefined;
        const fileName = buildAttachmentFileName({
            contentType: attachment.contentType,
            fileExtension: fileExt,
        });
        if (isPath) {
            writer.writeAttachmentFromPath(fileName, attachment.path);
        }
        else if (attachment.body) {
            writer.writeAttachment(fileName, attachment.body);
        }
        return fileName;
    }
}
_ShallowStepsStack_runningSteps = new WeakMap(), _ShallowStepsStack_instances = new WeakSet(), _ShallowStepsStack_currentStep_get = function _ShallowStepsStack_currentStep_get() {
    return __classPrivateFieldGet(this, _ShallowStepsStack_runningSteps, "f")[__classPrivateFieldGet(this, _ShallowStepsStack_runningSteps, "f").length - 1];
};
export class DefaultStepStack {
    constructor() {
        this.stepsByRoot = new Map();
        this.rootsByStep = new Map();
        this.clear = () => {
            this.stepsByRoot.clear();
            this.rootsByStep.clear();
        };
        this.removeRoot = (rootUuid) => {
            const maybeValue = this.stepsByRoot.get(rootUuid);
            this.stepsByRoot.delete(rootUuid);
            if (maybeValue) {
                maybeValue.forEach((stepUuid) => this.rootsByStep.delete(stepUuid));
            }
        };
        this.currentStep = (rootUuid) => {
            const maybeValue = this.stepsByRoot.get(rootUuid);
            if (!maybeValue) {
                return;
            }
            return maybeValue[maybeValue.length - 1];
        };
        this.addStep = (rootUuid, stepUuid) => {
            const maybeValue = this.stepsByRoot.get(rootUuid);
            if (!maybeValue) {
                this.stepsByRoot.set(rootUuid, [stepUuid]);
            }
            else {
                maybeValue.push(stepUuid);
            }
            this.rootsByStep.set(stepUuid, rootUuid);
        };
    }
    removeStep(stepUuid) {
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
    constructor({ writer, listeners = [], environmentInfo, categories, links, globalLabels = {}, }) {
        this.state = new LifecycleState();
        this.stepStack = new DefaultStepStack();
        this.globalLabels = [];
        this.startScope = () => {
            const uuid = randomUuid();
            this.state.setScope(uuid);
            return uuid;
        };
        this.updateScope = (uuid, updateFunc) => {
            const scope = this.state.getScope(uuid);
            if (!scope) {
                // eslint-disable-next-line no-console
                console.error(`count not update scope: no scope with uuid ${uuid} is found`);
                return;
            }
            updateFunc(scope);
        };
        this.writeScope = (uuid) => {
            const scope = this.state.getScope(uuid);
            if (!scope) {
                // eslint-disable-next-line no-console
                console.error(`count not write scope: no scope with uuid ${uuid} is found`);
                return;
            }
            __classPrivateFieldGet(this, _ReporterRuntime_writeFixturesOfScope, "f").call(this, scope);
            this.state.deleteScope(scope.uuid);
        };
        this.startFixture = (scopeUuid, type, fixtureResult) => {
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
        this.updateFixture = (uuid, updateFunc) => {
            const fixture = this.state.getFixtureResult(uuid);
            if (!fixture) {
                // eslint-disable-next-line no-console
                console.error(`could not update fixture: no fixture with uuid ${uuid} is found`);
                return;
            }
            updateFunc(fixture);
        };
        this.stopFixture = (uuid, opts) => {
            const fixture = this.state.getFixtureResult(uuid);
            if (!fixture) {
                // eslint-disable-next-line no-console
                console.error(`could not stop fixture: no fixture with uuid ${uuid} is found`);
                return;
            }
            const startStop = __classPrivateFieldGet(this, _ReporterRuntime_calculateTimings, "f").call(this, fixture.start, opts?.stop, opts?.duration);
            fixture.start = startStop.start;
            fixture.stop = startStop.stop;
            fixture.stage = Stage.FINISHED;
        };
        this.startTest = (result, scopeUuids = []) => {
            const uuid = randomUuid();
            const testResult = {
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
        this.updateTest = (uuid, updateFunc) => {
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
        this.stopTest = (uuid, opts) => {
            const wrapped = this.state.getWrappedTestResult(uuid);
            if (!wrapped) {
                // eslint-disable-next-line no-console
                console.error(`could not stop test result: no test with uuid ${uuid}) is found`);
                return;
            }
            const testResult = wrapped.value;
            this.notifier.beforeTestResultStop(testResult);
            const scopeUuids = wrapped.scopeUuids;
            scopeUuids.forEach((scopeUuid) => {
                const scope = this.state.getScope(scopeUuid);
                if (scope?.labels) {
                    testResult.labels = [...testResult.labels, ...scope.labels];
                }
                if (scope?.links) {
                    testResult.links = [...testResult.links, ...scope.links];
                }
                if (scope?.parameters) {
                    testResult.parameters = [...testResult.parameters, ...scope.parameters];
                }
                if (scope?.description) {
                    testResult.description = testResult.description ?? scope.description;
                }
                if (scope?.descriptionHtml) {
                    testResult.descriptionHtml = testResult.descriptionHtml ?? scope.descriptionHtml;
                }
            });
            testResult.labels = [...this.globalLabels, ...testResult.labels];
            testResult.testCaseId ?? (testResult.testCaseId = getTestResultTestCaseId(testResult));
            testResult.historyId ?? (testResult.historyId = getTestResultHistoryId(testResult));
            const startStop = __classPrivateFieldGet(this, _ReporterRuntime_calculateTimings, "f").call(this, testResult.start, opts?.stop, opts?.duration);
            testResult.start = startStop.start;
            testResult.stop = startStop.stop;
            this.notifier.afterTestResultStop(testResult);
        };
        this.writeTest = (uuid) => {
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
        this.currentStep = (rootUuid) => {
            return this.stepStack.currentStep(rootUuid);
        };
        this.startStep = (rootUuid, parentStepUuid, result) => {
            const parent = __classPrivateFieldGet(this, _ReporterRuntime_findParent, "f").call(this, rootUuid, parentStepUuid);
            if (!parent) {
                // eslint-disable-next-line no-console
                console.error(`could not start test step: no context for root ${rootUuid} and parentStepUuid ${JSON.stringify(parentStepUuid)} is found`);
                return;
            }
            const stepResult = {
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
        this.updateStep = (uuid, updateFunc) => {
            const step = this.state.getStepResult(uuid);
            if (!step) {
                // eslint-disable-next-line no-console
                console.error(`could not update test step: no step with uuid ${uuid} is found`);
                return;
            }
            updateFunc(step);
        };
        this.stopStep = (uuid, opts) => {
            const step = this.state.getStepResult(uuid);
            if (!step) {
                // eslint-disable-next-line no-console
                console.error(`could not stop test step: no step with uuid ${uuid} is found`);
                return;
            }
            this.notifier.beforeStepStop(step);
            const startStop = __classPrivateFieldGet(this, _ReporterRuntime_calculateTimings, "f").call(this, step.start, opts?.stop, opts?.duration);
            step.start = startStop.start;
            step.stop = startStop.stop;
            step.stage = Stage.FINISHED;
            this.stepStack.removeStep(uuid);
            this.notifier.afterStepStop(step);
        };
        this.writeAttachment = (rootUuid, parentStepUuid, attachmentName, attachmentContentOrPath, options) => {
            const parent = __classPrivateFieldGet(this, _ReporterRuntime_findParent, "f").call(this, rootUuid, parentStepUuid);
            if (!parent) {
                // eslint-disable-next-line no-console
                console.error(`could not write test attachment: no context for root ${rootUuid} and parentStepUuid ${JSON.stringify(parentStepUuid)} is found`);
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
            }
            else {
                this.writer.writeAttachment(attachmentFileName, attachmentContentOrPath);
            }
            const attachment = {
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
                });
            }
            else {
                parent.attachments.push(attachment);
            }
        };
        this.writeEnvironmentInfo = () => {
            if (!this.environmentInfo) {
                return;
            }
            this.writer.writeEnvironmentInfo(this.environmentInfo);
        };
        this.writeCategoriesDefinitions = () => {
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
        this.applyRuntimeMessages = (rootUuid, messages) => {
            messages.forEach((message) => {
                switch (message.type) {
                    case "metadata":
                        __classPrivateFieldGet(this, _ReporterRuntime_handleMetadataMessage, "f").call(this, rootUuid, message.data);
                        return;
                    case "step_metadata":
                        __classPrivateFieldGet(this, _ReporterRuntime_handleStepMetadataMessage, "f").call(this, rootUuid, message.data);
                        return;
                    case "step_start":
                        __classPrivateFieldGet(this, _ReporterRuntime_handleStartStepMessage, "f").call(this, rootUuid, message.data);
                        return;
                    case "step_stop":
                        __classPrivateFieldGet(this, _ReporterRuntime_handleStopStepMessage, "f").call(this, rootUuid, message.data);
                        return;
                    case "attachment_content":
                        __classPrivateFieldGet(this, _ReporterRuntime_handleAttachmentContentMessage, "f").call(this, rootUuid, message.data);
                        return;
                    case "attachment_path":
                        __classPrivateFieldGet(this, _ReporterRuntime_handleAttachmentPathMessage, "f").call(this, rootUuid, message.data);
                        return;
                    default:
                        // eslint-disable-next-line no-console
                        console.error(`could not apply runtime messages: unknown message ${JSON.stringify(message)}`);
                        return;
                }
            });
        };
        _ReporterRuntime_handleMetadataMessage.set(this, (rootUuid, message) => {
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
        });
        _ReporterRuntime_handleStepMetadataMessage.set(this, (rootUuid, message) => {
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
        });
        _ReporterRuntime_handleStartStepMessage.set(this, (rootUuid, message) => {
            this.startStep(rootUuid, undefined, { ...message });
        });
        _ReporterRuntime_handleStopStepMessage.set(this, (rootUuid, message) => {
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
        });
        _ReporterRuntime_handleAttachmentContentMessage.set(this, (rootUuid, message) => {
            this.writeAttachment(rootUuid, undefined, message.name, Buffer.from(message.content, message.encoding), {
                encoding: message.encoding,
                contentType: message.contentType,
                fileExtension: message.fileExtension,
                wrapInStep: message.wrapInStep,
                timestamp: message.timestamp,
            });
        });
        _ReporterRuntime_handleAttachmentPathMessage.set(this, (rootUuid, message) => {
            this.writeAttachment(rootUuid, undefined, message.name, message.path, {
                contentType: message.contentType,
                fileExtension: message.fileExtension,
                wrapInStep: message.wrapInStep,
                timestamp: message.timestamp,
            });
        });
        _ReporterRuntime_findParent.set(this, (rootUuid, parentStepUuid) => {
            const root = this.state.getExecutionItem(rootUuid);
            if (!root) {
                return;
            }
            if (parentStepUuid === null) {
                return root;
            }
            else if (parentStepUuid === undefined) {
                const stepUuid = this.currentStep(rootUuid);
                return stepUuid ? this.state.getStepResult(stepUuid) : root;
            }
            else {
                return this.state.getStepResult(parentStepUuid);
            }
        });
        _ReporterRuntime_writeFixturesOfScope.set(this, ({ fixtures, tests }) => {
            const writtenFixtures = new Set();
            if (tests.length) {
                for (const wrappedFixture of fixtures) {
                    if (!writtenFixtures.has(wrappedFixture.uuid)) {
                        __classPrivateFieldGet(this, _ReporterRuntime_writeContainer, "f").call(this, tests, wrappedFixture);
                        this.state.deleteFixtureResult(wrappedFixture.uuid);
                        writtenFixtures.add(wrappedFixture.uuid);
                    }
                }
            }
        });
        _ReporterRuntime_writeContainer.set(this, (tests, wrappedFixture) => {
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
        });
        _ReporterRuntime_calculateTimings.set(this, (start, stop, duration) => {
            const result = { start, stop };
            if (duration) {
                const normalisedDuration = Math.max(0, duration);
                if (result.stop !== undefined) {
                    result.start = result.stop - normalisedDuration;
                }
                else if (result.start !== undefined) {
                    result.stop = result.start + normalisedDuration;
                }
                else {
                    result.stop = Date.now();
                    result.start = result.stop - normalisedDuration;
                }
            }
            else {
                if (result.stop === undefined) {
                    result.stop = Date.now();
                }
                if (result.start === undefined) {
                    result.start = result.stop;
                }
            }
            return {
                start: result.start ? Math.round(result.start) : undefined,
                stop: result.stop ? Math.round(result.stop) : undefined,
            };
        });
        this.writer = resolveWriter(writer);
        this.notifier = new Notifier({ listeners });
        this.categories = categories;
        this.environmentInfo = environmentInfo;
        this.linkConfig = links;
        if (Array.isArray(globalLabels)) {
            this.globalLabels = globalLabels;
        }
        else if (Object.keys(globalLabels).length) {
            this.globalLabels = Object.entries(globalLabels).flatMap(([name, value]) => {
                if (Array.isArray(value)) {
                    return value.map((v) => ({ name, value: v }));
                }
                return {
                    name,
                    value,
                };
            });
        }
    }
}
_ReporterRuntime_handleMetadataMessage = new WeakMap(), _ReporterRuntime_handleStepMetadataMessage = new WeakMap(), _ReporterRuntime_handleStartStepMessage = new WeakMap(), _ReporterRuntime_handleStopStepMessage = new WeakMap(), _ReporterRuntime_handleAttachmentContentMessage = new WeakMap(), _ReporterRuntime_handleAttachmentPathMessage = new WeakMap(), _ReporterRuntime_findParent = new WeakMap(), _ReporterRuntime_writeFixturesOfScope = new WeakMap(), _ReporterRuntime_writeContainer = new WeakMap(), _ReporterRuntime_calculateTimings = new WeakMap();
//# sourceMappingURL=ReporterRuntime.js.map