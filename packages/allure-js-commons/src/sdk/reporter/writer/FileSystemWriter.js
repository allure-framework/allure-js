import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringifyEnvInfo } from "../utils/envInfo.js";
const writeJson = (path, data) => {
    writeFileSync(path, JSON.stringify(data), "utf-8");
};
export class FileSystemWriter {
    constructor(config) {
        this.config = config;
    }
    writeAttachment(distFileName, content) {
        const path = this.buildPath(distFileName);
        writeFileSync(path, content, "utf-8");
    }
    writeAttachmentFromPath(distFileName, from) {
        const to = this.buildPath(distFileName);
        copyFileSync(from, to);
    }
    writeEnvironmentInfo(info) {
        const text = stringifyEnvInfo(info);
        const path = this.buildPath("environment.properties");
        writeFileSync(path, text);
    }
    writeCategoriesDefinitions(categories) {
        const path = this.buildPath("categories.json");
        writeJson(path, categories);
    }
    writeGroup(result) {
        const path = this.buildPath(`${result.uuid}-container.json`);
        writeJson(path, result);
    }
    writeResult(result) {
        const path = this.buildPath(`${result.uuid}-result.json`);
        writeJson(path, result);
    }
    buildPath(name) {
        mkdirSync(this.config.resultsDir, {
            recursive: true,
        });
        return join(this.config.resultsDir, name);
    }
}
//# sourceMappingURL=FileSystemWriter.js.map