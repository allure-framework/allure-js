import { ExecutableItemWrapper } from "./ExecutableItemWrapper";
import { StepResult } from "./entities/StepResult";

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
