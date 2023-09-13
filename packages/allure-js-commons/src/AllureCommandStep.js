"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllureCommandStepExecutable = void 0;
const model_1 = require("./model");
class AllureCommandStepExecutable {
    constructor(name) {
        this.name = "";
        this.attachments = [];
        this.metadata = {};
        this.name = name;
    }
    static toExecutableItem(runtime, stepMetadata) {
        const executable = Object.assign(Object.assign({}, stepMetadata), { attachments: [], steps: [] });
        if (stepMetadata.attachments.length > 0) {
            stepMetadata.attachments.forEach((attachment) => {
                const attachmentContent = Buffer.from(attachment.content, attachment.encoding);
                const attachmentFilename = runtime.writeAttachment(attachmentContent, attachment.type, attachment.encoding);
                executable.attachments.push({
                    name: attachment.name,
                    type: attachment.type,
                    source: attachmentFilename,
                });
            });
        }
        if (stepMetadata.steps.length > 0) {
            executable.steps = stepMetadata.steps.map((nestedStep) => AllureCommandStepExecutable.toExecutableItem(runtime, nestedStep));
        }
        return executable;
    }
    label(label, value) {
        if (!this.metadata.labels) {
            this.metadata.labels = [];
        }
        this.metadata.labels.push({
            name: label,
            value,
        });
    }
    link(url, name, type) {
        if (!this.metadata.links) {
            this.metadata.links = [];
        }
        this.metadata.links.push({
            name,
            url,
            type,
        });
    }
    parameter(name, value, options) {
        if (!this.metadata.parameter) {
            this.metadata.parameter = [];
        }
        this.metadata.parameter.push({
            name,
            value: JSON.stringify(value),
            excluded: (options === null || options === void 0 ? void 0 : options.excluded) || false,
            mode: options === null || options === void 0 ? void 0 : options.mode,
        });
    }
    epic(epic) {
        this.label(model_1.LabelName.EPIC, epic);
    }
    feature(feature) {
        this.label(model_1.LabelName.FEATURE, feature);
    }
    story(story) {
        this.label(model_1.LabelName.STORY, story);
    }
    suite(name) {
        this.label(model_1.LabelName.SUITE, name);
    }
    parentSuite(name) {
        this.label(model_1.LabelName.PARENT_SUITE, name);
    }
    subSuite(name) {
        this.label(model_1.LabelName.SUB_SUITE, name);
    }
    owner(owner) {
        this.label(model_1.LabelName.OWNER, owner);
    }
    severity(severity) {
        this.label(model_1.LabelName.SEVERITY, severity);
    }
    tag(tag) {
        this.label(model_1.LabelName.TAG, tag);
    }
    issue(name, url) {
        this.link(url, name, model_1.LinkType.ISSUE);
    }
    tms(name, url) {
        this.link(url, name, model_1.LinkType.TMS);
    }
    attach(content, type) {
        const isBuffer = Buffer.isBuffer(content);
        this.attachments.push({
            name: "attachment",
            content: isBuffer ? content.toString("base64") : content,
            encoding: isBuffer ? "base64" : "utf8",
            type,
        });
    }
    description(content) {
        this.metadata.description = content;
    }
    async step(name, body) {
        if (!this.metadata.steps) {
            this.metadata.steps = [];
        }
        const nestedStep = new AllureCommandStepExecutable(name);
        await nestedStep.run(body, async ({ labels = [], links = [], parameter = [], steps = [] }) => {
            this.metadata.labels = (this.metadata.labels || []).concat(labels);
            this.metadata.links = (this.metadata.links || []).concat(links);
            this.metadata.parameter = (this.metadata.parameter || []).concat(parameter);
            this.metadata.steps = (this.metadata.steps || []).concat(steps);
        });
    }
    async start(body) {
        return await new Promise((resolve) => this.run(body, async (result) => resolve(result)));
    }
    async run(body, messageEmitter) {
        const startDate = new Date().getTime();
        try {
            await body.call(this, this);
            const _a = this.metadata, { steps = [], description = "", descriptionHtml = "" } = _a, metadata = __rest(_a, ["steps", "description", "descriptionHtml"]);
            await messageEmitter(Object.assign(Object.assign({}, metadata), { steps: [
                    {
                        name: this.name,
                        start: startDate,
                        stop: new Date().getTime(),
                        stage: model_1.Stage.FINISHED,
                        status: model_1.Status.PASSED,
                        statusDetails: {},
                        attachments: this.attachments,
                        parameters: [],
                        steps,
                        description,
                    },
                ] }));
        }
        catch (e) {
            const _b = this.metadata, { steps = [], description = "", descriptionHtml = "" } = _b, metadata = __rest(_b, ["steps", "description", "descriptionHtml"]);
            await messageEmitter(Object.assign(Object.assign({}, metadata), { steps: [
                    {
                        name: this.name,
                        start: startDate,
                        stop: new Date().getTime(),
                        stage: model_1.Stage.FINISHED,
                        status: model_1.Status.BROKEN,
                        statusDetails: {
                            message: e.message,
                            trace: e.trace,
                        },
                        attachments: this.attachments,
                        parameters: [],
                        steps,
                        description,
                    },
                ] }));
            throw e;
        }
    }
}
exports.AllureCommandStepExecutable = AllureCommandStepExecutable;
//# sourceMappingURL=AllureCommandStep.js.map