import { FixtureResult } from "./FixtureResult";
import { Link } from "./Link";
import { v4 as randomUUID } from "uuid";


export class TestResultContainer {
	uuid: string;
	name?: string;
	children: string[] = [];
	description?: string;
	descriptionHtml?: string;
	befores: FixtureResult[] = [];
	afters: FixtureResult[] = [];
	links: Link[] = [];
	start?: number;
	stop?: number;

	constructor() {
		this.uuid = randomUUID();
	}
}
