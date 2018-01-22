import { GherkinTestCase } from "./GherkinTestCase";
import { GherkinStep } from "./GherkinStep";

export class GherkinDocument {
	type: string;
	feature?: {
		type: string;
		tags: {
			name: string
		}[];
		name: string;
		description: string;
		children: GherkinTestCase[];
	};
	comments: string[];

	stepMap: Map<number, GherkinStep>; // not from input, internal bookkeeping; for steps from backgrounds
	caseMap: Map<number, GherkinTestCase>;
}
