import { ExecutableItem } from "./ExecutableItem";
import { Label } from "./Label";
import { Link } from "./Link";
import { v4 as randomUUID } from "uuid";

export class TestResult extends ExecutableItem {
	uuid: string;
	historyId: string;
	fullName: string;
	labels: Label[] = [];
	links: Link[] = [];

	constructor() {
		super();
		this.uuid = randomUUID();
		this.historyId = randomUUID();
	}
}
