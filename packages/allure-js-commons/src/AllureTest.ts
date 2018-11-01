import { ExecutableItemWrapper } from "./ExecutableItemWrapper";
import { TestResult } from "./entities/TestResult";
import { AllureGroup } from "./AllureGroup";
import { Label } from "./entities/Label";
import { Link } from "./entities/Link";
import { AllureRuntime } from "./AllureRuntime";

export class AllureTest extends ExecutableItemWrapper {
	private testResult: TestResult;

	constructor(private readonly runtime: AllureRuntime, private readonly parent?: AllureGroup) {
		super(new TestResult());
		this.testResult = this.wrappedItem as TestResult;
		this.testResult.start = Date.now();
	}

	endTest(): void {
		this.testResult.stop = Date.now();
		this.runtime.writeResult(this.testResult);
		// TODO: test that child steps ended
	}

	get uuid(): string {
		return this.testResult.uuid;
	}

	set historyId(id: string) {
		this.testResult.historyId = id;
	}

	set fullName(fullName: string) {
		this.testResult.fullName = fullName;
	}

	addLabel(name: string, value: string): void {
		this.testResult.labels.push(new Label(name, value));
	}

	addLink(name: string, url: string, type?: string): void {
		this.testResult.links.push(new Link(name, url, type));
	}
}
