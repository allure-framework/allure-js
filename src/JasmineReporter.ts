/* eslint-disable no-undef */
import {
	AllureGroup, AllureRuntime, AllureStep, AllureTest, ContentType, ExecutableItemWrapper, isPromise, LabelName,
	Severity, Stage, Status
} from "allure2-js-commons";
import FailedExpectation = jasmine.FailedExpectation;

enum SpecStatus {
	PASSED = "passed",
	FAILED = "failed",
	BROKEN = "broken",
	PENDING = "pending",
	DISABLED = "disabled"
}

export class JasmineAllureReporter implements jasmine.CustomReporter {
	private groupStack: AllureGroup[] = [];
	private runningTest: AllureTest | null = null;
	private stepStack: AllureStep[] = [];
	private runningExecutable: ExecutableItemWrapper | null = null;

	constructor(private readonly runtime: AllureRuntime) {
		this.installHooks();
	}

	private getCurrentGroup(): AllureGroup | null {
		if (this.groupStack.length === 0) return null;
		return this.groupStack[this.groupStack.length - 1];
	}

	get currentGroup(): AllureGroup {
		const currentGroup = this.getCurrentGroup();
		if (currentGroup === null) throw new Error("No active group");
		return currentGroup;
	}

	getInterface(): AllureInterface {
		return new AllureInterface(this);
	}

	get currentTest(): AllureTest {
		if (this.runningTest === null) throw new Error("No active test");
		return this.runningTest;
	}

	get currentExecutable(): ExecutableItemWrapper | null {
		//if (this.runningExecutable === null) throw new Error("No active executable");
		return this.runningExecutable;
	}

	writeAttachment(content: Buffer | string, type: ContentType): string {
		return this.runtime.writeAttachment(content, type);
	}

	jasmineStarted(suiteInfo: jasmine.SuiteInfo): void {
	}

	suiteStarted(suite: jasmine.CustomReporterResult): void {
		const name = suite.description;
		const group = (this.getCurrentGroup() || this.runtime).startGroup(name);
		this.groupStack.push(group);
	}

	specStarted(spec: jasmine.CustomReporterResult): void {
		let currentGroup = this.getCurrentGroup();
		if (currentGroup === null) throw new Error("No active suite");

		currentGroup = currentGroup.startGroup("Test wrapper"); // needed to hold beforeEach/AfterEach
		this.groupStack.push(currentGroup);

		const name = spec.description;
		const allureTest = currentGroup.startTest(name);
		if (this.runningTest != null) throw new Error("Test is starting before other ended!");
		this.runningTest = allureTest;

		allureTest.fullName = spec.fullName;
		allureTest.historyId = spec.fullName;
		allureTest.stage = Stage.RUNNING;

		// ignore wrapper, index + 1
		if (this.groupStack.length > 1) allureTest.addLabel(LabelName.PARENT_SUITE, this.groupStack[0].name);
		if (this.groupStack.length > 2) allureTest.addLabel(LabelName.SUITE, this.groupStack[1].name);
		if (this.groupStack.length > 3) allureTest.addLabel(LabelName.SUB_SUITE, this.groupStack[2].name);
		// TODO: if more depth add something to test name
	}

	specDone(spec: jasmine.CustomReporterResult): void {
		const currentTest = this.runningTest;
		if (currentTest === null) throw new Error("specDone while no test is running");

		if (this.stepStack.length > 0) {
			console.error("Allure reporter issue: step stack is not empty on specDone");
			for (const step of this.stepStack.reverse()) {
				step.status = Status.BROKEN;
				step.stage = Stage.INTERRUPTED;
				step.detailsMessage = "Timeout";
				step.endStep();
			}
			this.stepStack = [];
		}

		if (spec.status === SpecStatus.PENDING || spec.status === SpecStatus.DISABLED) {
			currentTest.status = Status.SKIPPED;
			currentTest.stage = Stage.PENDING;
			currentTest.detailsMessage = spec.pendingReason || "Suite disabled";
		}
		currentTest.stage = Stage.FINISHED;
		if (spec.status === SpecStatus.PASSED) {
			currentTest.status = Status.PASSED;
		}
		if (spec.status === SpecStatus.BROKEN) {
			currentTest.status = Status.BROKEN;
		}
		if (spec.status === SpecStatus.FAILED) {
			currentTest.status = Status.FAILED;
		}

		const exceptionInfo = this.findMessageAboutThrow(spec.failedExpectations) || this.findAnyError(spec.failedExpectations);
		if (exceptionInfo !== null) {
			currentTest.detailsMessage = exceptionInfo.message;
			currentTest.detailsTrace = exceptionInfo.stack;
		}

		currentTest.endTest();
		this.runningTest = null;

		this.currentGroup.endGroup(); // popping the test wrapper
		this.groupStack.pop();
	}

	suiteDone(suite: jasmine.CustomReporterResult): void {
		if (this.runningTest !== null) {
			console.error("Allure reporter issue: running test on suiteDone");
		}

		const currentGroup = this.getCurrentGroup();
		if (currentGroup === null) throw new Error("No active suite");

		currentGroup.endGroup();
		this.groupStack.pop();
	}

	jasmineDone(runDetails: jasmine.RunDetails): void {
	}

	private findMessageAboutThrow(expectations?: FailedExpectation[]): FailedExpectation | null {
		for (const e of expectations || []) {
			if (e.matcherName === "") return e;
		}
		return null;
	}

	private findAnyError(expectations?: FailedExpectation[]): FailedExpectation | null {
		expectations = expectations || [];
		if (expectations.length > 0) return expectations[0];
		return null;
	}

	pushStep(step: AllureStep): void {
		this.stepStack.push(step);
	}

	popStep(): void {
		this.stepStack.pop();
	}

	get currentStep(): AllureStep | null {
		if (this.stepStack.length > 0) return this.stepStack[this.stepStack.length - 1];
		return null;
	}

	private installHooks() {
		const reporter = this;
		const jasmineBeforeAll: (action: (done: DoneFn) => void, timeout?: number) => void = eval("global.beforeAll");
		const jasmineAfterAll: (action: (done: DoneFn) => void, timeout?: number) => void = eval("global.afterAll");
		const jasmineBeforeEach: (action: (done: DoneFn) => void, timeout?: number) => void = eval("global.beforeEach");
		const jasmineAfterEach: (action: (done: DoneFn) => void, timeout?: number) => void = eval("global.afterEach");

		function makeWrapperAll(wrapped: (action: (done: DoneFn) => void, timeout?: number) => void, fun: () => ExecutableItemWrapper) {
			return function(action: (done: DoneFn) => void, timeout?: number): void {
				wrapped(function(done) {
					reporter.runningExecutable = fun();
					let ret;
					if (action.length > 0) { // function takes done callback
						ret = reporter.runningExecutable.wrap(() => new Promise((resolve, reject) => {
							const t: any = resolve;
							t.fail = reject;
							action(t);
						}))();
					} else {
						ret = reporter.runningExecutable.wrap(action)();
					}
					if (isPromise(ret)) {
						(ret as Promise<any>).then(() => {
							reporter.runningExecutable = null;
							done();
						}).catch(e => {
							reporter.runningExecutable = null;
							done.fail(e);
						});
					} else {
						reporter.runningExecutable = null;
						done();
					}
				}, timeout);
			};
		}

		const wrapperBeforeAll = makeWrapperAll(jasmineBeforeAll, () => reporter.currentGroup.addBefore());
		const wrapperAfterAll = makeWrapperAll(jasmineAfterAll, () => reporter.currentGroup.addAfter());
		const wrapperBeforeEach = makeWrapperAll(jasmineBeforeEach, () => reporter.currentGroup.addBefore());
		const wrapperAfterEach = makeWrapperAll(jasmineAfterEach, () => reporter.currentGroup.addAfter());

		eval("global.beforeAll = wrapperBeforeAll;");
		eval("global.afterAll = wrapperAfterAll;");
		eval("global.beforeEach = wrapperBeforeEach;");
		eval("global.afterEach = wrapperAfterEach;");
	}
}


export class AllureInterface {
	constructor(private readonly reporter: JasmineAllureReporter) {
	}

	private get currentExecutable(): ExecutableItemWrapper {
		return this.reporter.currentStep || this.reporter.currentExecutable || this.reporter.currentTest;
	}

	setDescription(text: string) {
		this.currentExecutable.description = text;
		this.currentExecutable.descriptionHtml = text;
	}

	setFlaky() {
		this.currentExecutable.detailsFlaky = true;
	}

	setKnown() {
		this.currentExecutable.detailsKnown = true;
	}

	setMuted() {
		this.currentExecutable.detailsMuted = true;
	}

	addOwner(owner: string) {
		if (this.reporter.currentTest === null) throw new Error("No test running!");
		this.reporter.currentTest.addLabel(LabelName.OWNER, owner);
	}

	setSeverity(severity: Severity) {
		if (this.reporter.currentTest === null) throw new Error("No test running!");
		this.reporter.currentTest.addLabel(LabelName.SEVERITY, severity);
	}

	addIssue(issue: string) {
		if (this.reporter.currentTest === null) throw new Error("No test running!");
		this.reporter.currentTest.addLabel(LabelName.ISSUE, issue);
	}

	addTag(tag: string) {
		if (this.reporter.currentTest === null) throw new Error("No test running!");
		this.reporter.currentTest.addLabel(LabelName.TAG, tag);
	}

	addTestType(type: string) {
		if (this.reporter.currentTest === null) throw new Error("No test running!");
		this.reporter.currentTest.addLabel(LabelName.TEST_TYPE, type);
	}

	addLink(name: string, url: string, type?: string) {
		if (this.reporter.currentTest === null) throw new Error("No test running!");
		this.reporter.currentTest.addLink(name, url, type);
	}

	private startStep(name: string): WrappedStep {
		const allureStep: AllureStep = this.currentExecutable.startStep(name);
		this.reporter.pushStep(allureStep);
		return new WrappedStep(this.reporter, allureStep);
	}

	step<T>(name: string, body: () => any): any {
		const wrappedStep = this.startStep(name);
		let result;
		try {
			result = wrappedStep.run(body);
		} catch (err) {
			wrappedStep.endStep();
			throw err;
		}
		if (isPromise(result)) {
			const promise = result as Promise<any>;
			return promise.then(a => {
				wrappedStep.endStep();
				return a;
			}).catch(e => {
				wrappedStep.endStep();
				throw e;
			});
		} else {
			wrappedStep.endStep();
			return result;
		}
	}

	attachment(name: string, content: Buffer | string, type: ContentType) {
		const file = this.reporter.writeAttachment(content, type);
		this.currentExecutable.addAttachment(name, type, file);
	}
}

export class WrappedStep { // needed?
	constructor(private readonly reporter: JasmineAllureReporter, private readonly step: AllureStep) {
	}

	startStep(name: string): WrappedStep {
		const step = this.step.startStep(name);
		this.reporter.pushStep(step);
		return new WrappedStep(this.reporter, step);
	}

	endStep(): void {
		this.reporter.popStep();
		this.step.endStep();
	}

	run<T>(body: () => T): T {
		return this.step.wrap(body)();
	}
}

export class ConsoleReporter implements jasmine.CustomReporter {
	log(message: string) {
		console.log(new Date().toISOString(), message);
	}

	suiteStarted(suite: jasmine.CustomReporterResult) {
		this.log(`Suite started: ${suite.fullName}`);
	}

	suiteDone() {
		this.log("Suite ended\n\n");
	}

	specStarted(spec: jasmine.CustomReporterResult) {
		this.log(`Case started: ${spec.description}`);
	}

	specDone(spec: jasmine.CustomReporterResult) {
		this.log(`Case ended: ${spec.status}\n\n`);
		/*for (const fail of spec.failedExpectations) {
			console.error(fail.message);
			console.error(fail.stack);
		}*/
	}
}
