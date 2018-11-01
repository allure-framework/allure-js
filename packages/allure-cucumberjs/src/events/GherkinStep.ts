export class GherkinStep {
	location?: {
		line: number
	};
	keyword?: string;
	text?: string;
	argument?: {
		type: String;
		content?: string;
		rows?: {
			cells: {
				value: string
			}[]
		}[];
	};

	isBackground?: boolean; // internal
}
