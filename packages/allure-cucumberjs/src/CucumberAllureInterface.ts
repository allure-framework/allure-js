import {
	AllureInterface,
	AllureStep,
	AllureTest,
	ContentType,
	ExecutableItemWrapper,
	GlobalInfoWriter,
	isPromise,
	LabelName,
	Severity
} from "allure-js-commons";
import { CucumberJSAllureFormatter } from "./CucumberJSAllureReporter";

export class CucumberAllureInterface extends AllureInterface {
	constructor(private readonly reporter: CucumberJSAllureFormatter) {
		super();
	}

	private get currentExecutable(): ExecutableItemWrapper {
		const result = this.reporter.currentStep || this.reporter.currentTest;
		if (result === null) throw new Error("No executable!");
		return result;
	}

	private get currentTest(): AllureTest {
		if (this.reporter.currentTest === null) throw new Error("No test running!");
		return this.reporter.currentTest;
	}

	setDescription(text: string) {
		this.currentExecutable.description = text;
		this.currentExecutable.descriptionHtml = text;
	}

	setTestDescription(text: string) {
		this.currentTest.description = text;
		this.currentTest.descriptionHtml = text;
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
		this.currentTest.addLabel(LabelName.OWNER, owner);
	}

	setSeverity(severity: Severity) {
		this.currentTest.addLabel(LabelName.SEVERITY, severity);
	}

	addIssue(issue: string) {
		this.currentTest.addLabel(LabelName.ISSUE, issue);
	}

	addTag(tag: string) {
		this.currentTest.addLabel(LabelName.TAG, tag);
	}

	addTestType(type: string) {
		this.currentTest.addLabel(LabelName.TEST_TYPE, type);
	}

	addLink(name: string, url: string, type?: string) {
		this.currentTest.addLink(name, url, type);
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

	testAttachment(name: string, content: Buffer | string, type: ContentType) {
		const file = this.reporter.writeAttachment(content, type);
		this.currentTest.addAttachment(name, type, file);
	}

	addParameter(name: string, value: string): void {
		this.currentTest.addParameter(name, value);
	}

	addLabel(name: string, value: string): void {
		this.currentTest.addLabel(name, value);
	}

	getGlobalInfoWriter(): GlobalInfoWriter {
		return this.reporter.getGlobalInfoWriter();
	}
}

export class WrappedStep {
	constructor(private readonly reporter: CucumberJSAllureFormatter, private readonly step: AllureStep) {
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
