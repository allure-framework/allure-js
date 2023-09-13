"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAllureWriter = void 0;
const fs_1 = require("fs");
class InMemoryAllureWriter {
    constructor() {
        this.groups = [];
        this.tests = [];
        this.attachments = {};
    }
    writeGroup(result) {
        this.groups.push(result);
    }
    writeResult(result) {
        this.tests.push(result);
    }
    writeAttachment(name, content) {
        this.attachments[name] = content;
    }
    writeAttachmentFromPath(from, toFileName) {
        this.attachments[toFileName] = (0, fs_1.readFileSync)(from);
    }
    writeCategoriesDefinitions(categories) {
        if (this.categories) {
            console.warn("overwriting existing categories");
        }
        this.categories = categories;
    }
    writeEnvironmentInfo(envInfo) {
        if (this.envInfo) {
            console.warn("overwriting existing environment info");
        }
        this.envInfo = envInfo;
    }
    reset() {
        this.groups = [];
        this.tests = [];
        this.attachments = {};
    }
    getMaybeTestByName(name) {
        return this.tests.find((t) => t.name === name);
    }
    getTestByName(name) {
        const res = this.getMaybeTestByName(name);
        if (!res) {
            throw new Error(`Test not found: ${name}`);
        }
        return res;
    }
    getMaybeGroupByName(name) {
        return this.groups.find((g) => g.name === name);
    }
    getGroupByName(name) {
        const res = this.getMaybeGroupByName(name);
        if (!res) {
            throw new Error(`Group not found: ${name}`);
        }
        return res;
    }
}
exports.InMemoryAllureWriter = InMemoryAllureWriter;
//# sourceMappingURL=InMemoryAllureWriter.js.map