import { HookCode, HookOptions } from "cucumber";

export interface TestHookDefinition {
	code: HookCode;
	line: number;
	options?: HookOptions;
	pattern?: any;
	uri: string;
}
