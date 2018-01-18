import { Formatter, World as CucumberWorld } from "cucumber";
import {
	AllureGroup,
	AllureRuntime,
	AllureStep,
	AllureTest,
	ContentType,
	ExecutableItemWrapper,
	isPromise,
	LabelName,
	Severity,
	Stage,
	Status
} from "allure2-js-commons";
import { createHash } from "crypto";
import { Result } from "./events/Result";
import { SourceLocation } from "./events/SourceLocation";
import { GherkinStep } from "./events/GherkinStep";
import { GherkinTestCase } from "./events/GherkinTestCase";
import { GherkinDocument } from "./events/GherkinDocument";
import { examplesToSensibleFormat } from "./events/Example";

export interface World extends CucumberWorld {
	allure: AllureInterface;
}

export class CucumberJSAllureFormatter extends Formatter {
	private readonly sourceMap: Map<string, string[]> = new Map();
	private readonly stepsMap: Map<string, SourceLocation[]> = new Map();
	private readonly featureMap: Map<string, GherkinDocument> = new Map();
	private readonly labels: { [key: string]: RegExp[]; };


	private stepStack: AllureStep[] = [];
	currentGroup: AllureGroup;
	currentTest: AllureTest;

	public readonly allureInterface: AllureInterface;

	constructor(options: any, private readonly allureRuntime: AllureRuntime, config: { labels: { [key: string]: RegExp[]; } }) {
		super(options);
		options.eventBroadcaster
			.on("source", this.onSource.bind(this))
			.on("gherkin-document", this.onGherkinDocument.bind(this))
			.on("test-case-prepared", this.onTestCasePrepared.bind(this))
			.on("test-case-started", this.onTestCaseStarted.bind(this))
			.on("test-step-started", this.onTestStepStarted.bind(this))
			.on("test-step-attachment", this.onTestStepAttachment.bind(this))
			.on("test-step-finished", this.onTestStepFinished.bind(this))
			.on("test-case-finished", this.onTestCaseFinished.bind(this));

		this.labels = config.labels;

		this.allureInterface = new AllureInterface(this);
		options.supportCodeLibrary.World.prototype.allure = this.allureInterface;
	}

	private hash(data: string): string {
		return createHash("md5").update(data).digest("hex");
	}

	private getSource(location: SourceLocation): string {
		//if (location === undefined) throw new Error("Source location is undefined");
		return (this.sourceMap.get(location.sourceLocation.uri) || [])[location.sourceLocation.line - 1];
	}

	onSource(data: { uri: string, data: string, media: { encoding: string, type: string } }) {
		this.sourceMap.set(data.uri, data.data.split(/\n/));
	}

	onGherkinDocument(data: { uri: string, document: GherkinDocument }) {
		// "ScenarioOutline"
		data.document.caseMap = new Map<number, GherkinTestCase>();
		data.document.stepMap = new Map<number, GherkinStep>();
		for (const test of data.document.feature.children) {
			test.stepMap = new Map();
			if (test.type === "Background") {
				data.document.stepMap = new Map();
				for (const step of test.steps) {
					data.document.stepMap.set(step.location.line, step);
				}
			} else {
				for (const step of test.steps) {
					test.stepMap.set(step.location.line, step);
				}
			}

			if (test.type === "ScenarioOutline") {
				for (const example of examplesToSensibleFormat(test.examples || [])) {
					const copy = { ...test };
					copy.example = example;
					data.document.caseMap.set(example.line, copy);
				}
			} else {
				data.document.caseMap.set(test.location.line, test);
			}
		}
		this.featureMap.set(data.uri, data.document);
	}

	onTestCasePrepared(data: { steps: SourceLocation[] } & SourceLocation) {
		this.stepsMap.clear();
		this.stepsMap.set(SourceLocation.toKey(data), data.steps);
	}

	onTestCaseStarted(data: SourceLocation) {
		const feature = this.featureMap.get(data.sourceLocation.uri);
		if (feature === undefined) throw new Error("Unknown feature");
		const test = feature.caseMap.get(data.sourceLocation.line);
		if (test === undefined) throw new Error("Unknown scenario");

		console.log(`Test case started: ${test.name} (${test.description})`);

		this.currentGroup = this.allureRuntime.startGroup("");
		this.currentTest = this.currentGroup.startTest(test.name);

		const info = {
			f: feature.feature.name,
			t: test.name,
			a: <any>null
		};

		if (test.example !== undefined) {
			info.a = test.example.arguments;
			for (const prop in test.example.arguments) {
				if (!test.example.arguments.hasOwnProperty(prop)) continue;
				this.currentTest.addParameter(prop, test.example.arguments[prop]);
			}
		}

		this.currentTest.historyId = this.hash(JSON.stringify(info));

		this.currentTest.addLabel(LabelName.FEATURE, feature.feature.name);
		//this.currentTest.addLabel(LabelName.STORY, feature.feature.name);
		this.currentTest.description = test.description || "";
		for (const tag of [...(test.tags || []), ...feature.feature.tags]) {
			this.currentTest.addLabel(LabelName.TAG, tag.name);

			for (const label in this.labels) {
				if (!this.labels.hasOwnProperty(label)) continue;
				for (const reg of this.labels[label]) {
					const match = tag.name.match(reg);
					if (match != null && match.length > 1) {
						this.currentTest.addLabel(label, match[1]);
					}
				}
			}
		}
	}

	onTestStepStarted(data: { index: number, testCase: SourceLocation }) {
		const location = (this.stepsMap.get(SourceLocation.toKey(data.testCase)) || [])[data.index];

		const feature = this.featureMap.get(data.testCase.sourceLocation.uri);
		if (feature === undefined) throw new Error("Unknown feature");
		const test = feature.caseMap.get(data.testCase.sourceLocation.line);
		if (test === undefined) throw new Error("Unknown scenario");
		let step: GherkinStep | undefined;
		if (location.sourceLocation !== undefined) {
			step = test.stepMap.get(location.sourceLocation.line) || feature.stepMap.get(location.sourceLocation.line);
		} else {
			if (location.actionLocation === undefined) location.actionLocation = { uri: "unknown", line: -1 };
			step = {
				location: { line: -1 },
				text: `${location.actionLocation.uri}:${location.actionLocation.line}`,
				keyword: ""
			};
		}
		if (step === undefined) throw new Error("Unknown step");

		let stepText = `${step.keyword}${step.text}`;
		if (test.example !== undefined) {
			for (const argName in test.example.arguments) {
				if (!test.example.arguments.hasOwnProperty(argName)) continue;
				stepText = stepText.replace(argName, test.example.arguments[argName]);
			}
		}

		console.log(stepText);
		const allureStep = this.currentTest.startStep(stepText);
		this.pushStep(allureStep);

		if (step.argument !== undefined) {
			if (step.argument.content !== undefined) {
				const file = this.allureRuntime.writeAttachment(step.argument.content, ContentType.TEXT);
				allureStep.addAttachment("Text", ContentType.TEXT, file);
			}
			if (step.argument.rows !== undefined) {
				const file = this.allureRuntime.writeAttachment(
					step.argument.rows.map(row => row.cells.map(cell => cell.value.replace(/\t/g, "    ")).join("\t")).join("\n"),
					ContentType.TSV
				);
				allureStep.addAttachment("Table", ContentType.TSV, file);
			}
		}
	}

	onTestStepAttachment(data: { index: number, data: string, media: { type: string }, testCase: SourceLocation }) {
		if (this.currentStep === null) throw new Error("There is no step to add attachment to");
		const type: ContentType = <ContentType>data.media.type;
		let content: string | Buffer = data.data;
		if ([ContentType.JPEG, ContentType.PNG, ContentType.WEBM].indexOf(type) >= 0) content = Buffer.from(content, "base64");
		const file = this.allureRuntime.writeAttachment(content, type);
		this.currentStep.addAttachment("attached", type, file);
	}

	onTestStepFinished(data: { index: number, result: Result, testCase: SourceLocation }) {
		const currentStep = this.currentStep; // eslint-disable-line prefer-destructuring
		if (currentStep === null) throw new Error("No current step defined");
		currentStep.status = statusTextToAllure(data.result.status);
		currentStep.stage = statusTextToStage(data.result.status);
		if (data.result.exception !== undefined) {
			currentStep.detailsMessage = data.result.exception.message;
			currentStep.detailsTrace = data.result.exception.stack || "";
		}
		currentStep.endStep();
		this.popStep();
	}

	onTestCaseFinished(data: { result: Result } & SourceLocation) {
		this.currentTest.status = statusTextToAllure(data.result.status);
		this.currentTest.stage = statusTextToStage(data.result.status);
		if (data.result.exception !== undefined) {
			this.currentTest.detailsMessage = data.result.exception.message;
			this.currentTest.detailsTrace = data.result.exception.stack || "";
		}

		this.currentTest.endTest();
		this.currentGroup.endGroup();
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

	writeAttachment(content: Buffer | string, type: ContentType): string {
		return this.allureRuntime.writeAttachment(content, type);
	}
}

export class AllureInterface {
	constructor(private readonly reporter: CucumberJSAllureFormatter) {
	}

	private get currentExecutable(): ExecutableItemWrapper {
		return this.reporter.currentStep || this.reporter.currentTest;
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


function statusTextToAllure(status: string): Status {
	if (status === "passed") return Status.PASSED;
	if (status === "skipped") return Status.SKIPPED;
	if (status === "failed") return Status.FAILED;
	return Status.BROKEN;
}

function statusTextToStage(status: string): Stage {
	if (status === "passed") return Stage.FINISHED;
	if (status === "skipped") return Stage.PENDING;
	if (status === "failed") return Stage.INTERRUPTED;
	return Stage.INTERRUPTED;
}


