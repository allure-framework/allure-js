"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllureTest = void 0;
const AllureCommandStep_1 = require("./AllureCommandStep");
const constructors_1 = require("./constructors");
const ExecutableItemWrapper_1 = require("./ExecutableItemWrapper");
const model_1 = require("./model");
const utils_1 = require("./utils");
class AllureTest extends ExecutableItemWrapper_1.ExecutableItemWrapper {
    constructor(runtime, start = Date.now()) {
        super((0, constructors_1.testResult)());
        this.runtime = runtime;
        this.historyIdSetManually = false;
        this.testResult = this.wrappedItem;
        this.testResult.start = start;
    }
    endTest(stop = Date.now()) {
        this.testResult.stop = stop;
        this.runtime.writeResult(this.testResult);
    }
    get uuid() {
        return this.testResult.uuid;
    }
    set historyId(id) {
        this.historyIdSetManually = true;
        this.testResult.historyId = id;
    }
    set fullName(fullName) {
        this.testResult.fullName = fullName;
    }
    set testCaseId(testCaseId) {
        this.testResult.testCaseId = testCaseId;
    }
    addLabel(name, value) {
        this.testResult.labels.push({ name, value });
    }
    addLink(url, name, type) {
        this.testResult.links.push({ name, url, type });
    }
    addIssueLink(url, name) {
        this.addLink(url, name, model_1.LinkType.ISSUE);
    }
    addTmsLink(url, name) {
        this.addLink(url, name, model_1.LinkType.TMS);
    }
    calculateHistoryId() {
        if (this.historyIdSetManually) {
            return;
        }
        const tcId = this.testResult.testCaseId
            ? this.testResult.testCaseId
            : this.testResult.fullName
                ? (0, utils_1.md5)(this.testResult.fullName)
                : null;
        if (!tcId) {
            return;
        }
        const paramsString = this.testResult.parameters
            .filter((p) => !(p === null || p === void 0 ? void 0 : p.excluded))
            .sort((a, b) => { var _a, _b; return ((_a = a.name) === null || _a === void 0 ? void 0 : _a.localeCompare(b === null || b === void 0 ? void 0 : b.name)) || ((_b = a.value) === null || _b === void 0 ? void 0 : _b.localeCompare(b === null || b === void 0 ? void 0 : b.value)); })
            .map((p) => { var _a, _b; return `${(_a = p.name) !== null && _a !== void 0 ? _a : "null"}:${(_b = p.value) !== null && _b !== void 0 ? _b : "null"}`; })
            .join(",");
        const paramsHash = (0, utils_1.md5)(paramsString);
        this.historyId = `${tcId}:${paramsHash}`;
    }
    applyMetadata(metadata, stepApplyFn) {
        const { attachments = [], labels = [], links = [], parameter = [], steps = [], description, descriptionHtml, displayName, historyId, testCaseId, } = metadata;
        labels.forEach((label) => {
            this.addLabel(label.name, label.value);
        });
        links.forEach((link) => {
            this.addLink(link.url, link.name, link.type);
        });
        parameter.forEach((param) => {
            this.parameter(param.name, param.value, {
                excluded: param.excluded,
                mode: param.mode,
            });
        });
        attachments.forEach((attachment) => {
            const attachmentFilename = this.runtime.writeAttachment(attachment.content, attachment.type, attachment.encoding);
            this.addAttachment("Attachment", {
                contentType: attachment.type,
            }, attachmentFilename);
        });
        if (description) {
            this.description = description;
        }
        if (descriptionHtml) {
            this.descriptionHtml = descriptionHtml;
        }
        if (displayName) {
            this.name = displayName;
        }
        if (testCaseId) {
            this.testCaseId = testCaseId;
        }
        if (historyId) {
            this.historyId = historyId;
        }
        steps.forEach((stepMetadata) => {
            const step = AllureCommandStep_1.AllureCommandStepExecutable.toExecutableItem(this.runtime, stepMetadata);
            if (stepApplyFn) {
                stepApplyFn(step);
                return;
            }
            this.addStep(step);
        });
    }
}
exports.AllureTest = AllureTest;
//# sourceMappingURL=AllureTest.js.map