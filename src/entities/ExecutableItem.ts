import { Status } from "./Status";
import { StatusDetails } from "./StatusDetails";
import { Stage } from "./Stage";
import { StepResult } from "./StepResult";
import { Attachment } from "./Attachment";
import { Parameter } from "./Parameter";

export class ExecutableItem {
	name: string;
	status: Status = Status.BROKEN;
	statusDetails: StatusDetails = new StatusDetails();
	stage: Stage = Stage.SCHEDULED;
	description: string;
	descriptionHtml: string;
	steps: StepResult[] = [];
	attachments: Attachment[] = [];
	parameters: Parameter[] = [];
	start: number;
	stop: number;
}
