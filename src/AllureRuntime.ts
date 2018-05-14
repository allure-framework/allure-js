import { TestResult } from "./entities/TestResult";
import { existsSync, writeFileSync } from "fs";
import { sync as mkdirSync } from "mkdirp";
import { join as buildPath } from "path";
import { TestResultContainer } from "./entities/TestResultContainer";
import { v4 as randomUUID } from "uuid";
import { stringify } from "properties";
import { ContentType, typeToExtension } from "./entities/ContentType";
import { ExecutorInfo } from "./entities/ExecutorInfo";
import { Category } from "./entities/Category";
import { AllureConfig } from "./AllureConfig";
import { AllureGroup } from "./AllureGroup";

export class AllureRuntime {
	private config: AllureConfig;

	constructor(config: AllureConfig) {
		this.config = config;
		if (!existsSync(this.config.resultsDir)) mkdirSync(this.config.resultsDir);
	}

	startGroup(name?: string): AllureGroup {
		const allureContainer = new AllureGroup(this);
		allureContainer.name = name || "Unnamed";
		return allureContainer;
	}

	writeResult(result: TestResult): void {
		const modifiedResult = this.config.testMapper(result);
		if (modifiedResult != null) {
			const path = buildPath(this.config.resultsDir, `${modifiedResult.uuid}-result.json`);
			writeFileSync(path, JSON.stringify(modifiedResult), { encoding: "utf-8" });
		}
	}

	writeGroup(result: TestResultContainer): void {
		const path = buildPath(this.config.resultsDir, `${result.uuid}-container.json`);
		writeFileSync(path, JSON.stringify(result), { encoding: "utf-8" });
	}

	writeAttachment(content: Buffer | string, contentType: ContentType): string {
		const extension = typeToExtension(contentType);
		const fileName = `${randomUUID()}-attachment.${extension}`;
		const path = buildPath(this.config.resultsDir, fileName);
		writeFileSync(path, content, { encoding: "utf-8" });
		return fileName;
	}

	writeExecutorInfo(info: ExecutorInfo) {
		const path = buildPath(this.config.resultsDir, "executor.json");
		writeFileSync(path, JSON.stringify(info), { encoding: "utf-8" });
	}

	writeEnvironmentInfo(info?: { [key: string]: string }) {
		const path = buildPath(this.config.resultsDir, "environment.properties");
		const target = info || process.env;
		const text = stringify(target, { unicode: true });
		writeFileSync(path, text, { encoding: "utf-8" });
	}

	writeCategories(categories: Category[]) {
		const path = buildPath(this.config.resultsDir, "categories.json");
		writeFileSync(path, JSON.stringify(categories.map(c => {
			if (c.messageRegex instanceof RegExp) c.messageRegex = c.messageRegex.source;
			if (c.traceRegex instanceof RegExp) c.traceRegex = c.traceRegex.source;
			return c;
		})), { encoding: "utf-8" });
	}
}
