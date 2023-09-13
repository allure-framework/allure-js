"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemAllureWriter = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const properties_1 = require("properties");
const writeJson = (path, data) => {
    (0, fs_1.writeFileSync)(path, JSON.stringify(data), { encoding: "utf-8" });
};
class FileSystemAllureWriter {
    constructor(config) {
        this.config = config;
        if (!(0, fs_1.existsSync)(this.config.resultsDir)) {
            (0, fs_1.mkdirSync)(this.config.resultsDir, {
                recursive: true,
            });
        }
    }
    writeAttachment(name, content, encoding = "utf-8") {
        const path = this.buildPath(name);
        (0, fs_1.writeFileSync)(path, content, { encoding });
    }
    writeAttachmentFromPath(from, distFileName) {
        const to = this.buildPath(distFileName);
        (0, fs_1.copyFileSync)(from, to);
    }
    writeEnvironmentInfo(info) {
        const text = (0, properties_1.stringify)(info, { unicode: true }).toString();
        const path = this.buildPath("environment.properties");
        (0, fs_1.writeFileSync)(path, text);
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
        return (0, path_1.join)(this.config.resultsDir, name);
    }
}
exports.FileSystemAllureWriter = FileSystemAllureWriter;
//# sourceMappingURL=FileSystemAllureWriter.js.map