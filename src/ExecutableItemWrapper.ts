import { ExecutableItem } from "./entities/ExecutableItem";
import { Status } from "./entities/Status";
import { StatusDetails } from "./entities/StatusDetails";
import { Stage } from "./entities/Stage";
import { Parameter } from "./entities/Parameter";
import { ContentType } from "./entities/ContentType";
import { Attachment } from "./entities/Attachment";
import { StepResult } from "./entities/StepResult";
import { isPromise } from "./isPromise";

export class ExecutableItemWrapper {
	constructor(private readonly info: ExecutableItem) {
	}

	protected get wrappedItem() {
		return this.info;
	}

	public set name(name: string) {
		this.info.name = name;
	}

	public set description(description: string) {
		this.info.description = description;
	}

	public set descriptionHtml(descriptionHtml: string) {
		this.info.descriptionHtml = descriptionHtml;
	}

	public set status(status: Status) {
		this.info.status = status;
	}

	public set statusDetails(details: StatusDetails) {
		this.info.statusDetails = details;
	}

	public set detailsMessage(message: string) {
		this.info.statusDetails.message = message;
	}

	public set detailsTrace(trace: string) {
		this.info.statusDetails.trace = trace;
	}

	public set detailsMuted(muted: boolean) {
		this.info.statusDetails.muted = muted;
	}

	public set detailsKnown(known: boolean) {
		this.info.statusDetails.known = known;
	}

	public set detailsFlaky(flaky: boolean) {
		this.info.statusDetails.flaky = flaky;
	}

	public set stage(stage: Stage) {
		this.info.stage = stage;
	}

	public addParameter(name: string, value: string) {
		this.info.parameters.push(new Parameter(name, value));
	}

	public addAttachment(name: string, type: ContentType, fileName: string) {
		this.info.attachments.push(new Attachment(name, type, fileName));
	}

	public startStep(name: string): AllureStep {
		const stepResult = new ExecutableItem() as StepResult;
		this.info.steps.push(stepResult);

		const allureStep = new AllureStep(stepResult);
		allureStep.name = name;
		return allureStep;
	}

	public wrap<T>(fun: (...args: any[]) => any) {
		return (...args: any[]) => {
			this.stage = Stage.RUNNING;
			let result;
			try {
				result = fun(args);
			} catch (error) {
				this.stage = Stage.INTERRUPTED; // fixme is this right for exception?
				this.status = Status.BROKEN;
				if (error) {
					this.detailsMessage = (error as Error).message || "";
					this.detailsTrace = (error as Error).stack || "";
				}
				throw error;
			}
			if (isPromise(result)) {
				const promise = result as Promise<any>;
				return promise.then(res => {
					this.status = Status.PASSED;
					this.stage = Stage.FINISHED;
					return res;
				}).catch(error => {
					this.stage = Stage.INTERRUPTED; // fixme is this right for exception?
					this.status = Status.BROKEN;
					if (error) {
						this.detailsMessage = (error as Error).message || "";
						this.detailsTrace = (error as Error).stack || "";
					}
					throw error;
				});
			} else {
				this.status = Status.PASSED;
				this.stage = Stage.FINISHED;
				return result;
			}
		};
	}
}

// This class is here because of circular dependency with ExecutableItemWrapper
export class AllureStep extends ExecutableItemWrapper {
	constructor(private readonly stepResult: StepResult) {
		super(stepResult);
		this.stepResult.start = Date.now();
	}

	endStep() {
		this.stepResult.stop = Date.now();
		// TODO: test that child steps ended
	}
}
