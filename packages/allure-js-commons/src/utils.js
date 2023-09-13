"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = exports.getSuitesLabels = exports.getStatusFromError = exports.allureLabelRegexpGlobal = exports.allureLabelRegexp = exports.allureIdRegexpGlobal = exports.allureIdRegexp = exports.defaultReportFolder = exports.allureReportFolder = exports.stripAscii = exports.readImageAsBase64 = exports.isAllStepsEnded = exports.isAnyStepFailed = exports.escapeRegExp = exports.getLabelsFromEnv = exports.md5 = void 0;
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const process_1 = require("process");
const model_1 = require("./model");
const md5 = (data) => (0, crypto_1.createHash)("md5").update(data).digest("hex");
exports.md5 = md5;
const getLabelsFromEnv = () => {
    const envKeys = Object.keys(process_1.env);
    const labels = [];
    envKeys.forEach((key) => {
        var _a;
        const labelRegexp = /^ALLURE_LABEL_(?<labelName>.+)$/;
        const match = key.match(labelRegexp);
        if (match) {
            const labelName = (_a = match.groups) === null || _a === void 0 ? void 0 : _a.labelName;
            const envValue = process.env[key];
            if (labelName && envValue) {
                labels.push({ name: labelName.toLocaleLowerCase(), value: envValue });
            }
        }
    });
    return labels;
};
exports.getLabelsFromEnv = getLabelsFromEnv;
const reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar.source);
const escapeRegExp = (value) => {
    return reHasRegExpChar.test(value) ? value.replace(reRegExpChar, "\\$&") : value;
};
exports.escapeRegExp = escapeRegExp;
const isAnyStepFailed = (item) => {
    const isFailed = item.status === model_1.Status.FAILED;
    if (isFailed || item.steps.length === 0) {
        return isFailed;
    }
    return !!item.steps.find((step) => (0, exports.isAnyStepFailed)(step));
};
exports.isAnyStepFailed = isAnyStepFailed;
const isAllStepsEnded = (item) => {
    return item.steps.every((val) => val.stop && (0, exports.isAllStepsEnded)(val));
};
exports.isAllStepsEnded = isAllStepsEnded;
const readImageAsBase64 = async (filePath) => {
    try {
        const file = await (0, promises_1.readFile)(filePath, { encoding: "base64" });
        return file ? `data:image/png;base64,${file}` : undefined;
    }
    catch (e) {
        return undefined;
    }
};
exports.readImageAsBase64 = readImageAsBase64;
const asciiRegex = new RegExp("[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", "g");
const stripAscii = (str) => {
    return str.replace(asciiRegex, "");
};
exports.stripAscii = stripAscii;
const allureReportFolder = (outputFolder) => {
    if (process.env.ALLURE_RESULTS_DIR) {
        return path_1.default.resolve(process.cwd(), process.env.ALLURE_RESULTS_DIR);
    }
    if (outputFolder) {
        return outputFolder;
    }
    return (0, exports.defaultReportFolder)();
};
exports.allureReportFolder = allureReportFolder;
const defaultReportFolder = () => {
    return path_1.default.resolve(process.cwd(), "allure-results");
};
exports.defaultReportFolder = defaultReportFolder;
exports.allureIdRegexp = /@?allure.id[:=](?<id>[^\s]+)/;
exports.allureIdRegexpGlobal = new RegExp(exports.allureIdRegexp, "g");
exports.allureLabelRegexp = /@?allure.label.(?<name>[^\s]+?)[:=](?<value>[^\s]+)/;
exports.allureLabelRegexpGlobal = new RegExp(exports.allureLabelRegexp, "g");
const getStatusFromError = (error) => {
    switch (true) {
        case /assert/gi.test(error.constructor.name):
        case /assert/gi.test(error.name):
        case /assert/gi.test(error.message):
            return model_1.Status.FAILED;
        default:
            return model_1.Status.BROKEN;
    }
};
exports.getStatusFromError = getStatusFromError;
const getSuitesLabels = (suites) => {
    if (suites.length === 0) {
        return [];
    }
    const [parentSuite, suite, ...subSuites] = suites;
    const labels = [];
    if (parentSuite) {
        labels.push({
            name: model_1.LabelName.PARENT_SUITE,
            value: parentSuite,
        });
    }
    if (suite) {
        labels.push({
            name: model_1.LabelName.SUITE,
            value: suite,
        });
    }
    if (subSuites.length > 0) {
        labels.push({
            name: model_1.LabelName.SUB_SUITE,
            value: subSuites.join(" > "),
        });
    }
    return labels;
};
exports.getSuitesLabels = getSuitesLabels;
const serialize = (val) => {
    if (typeof val === "object" && !(val instanceof Map || val instanceof Set)) {
        return JSON.stringify(val);
    }
    if (val === undefined) {
        return "undefined";
    }
    return val.toString();
};
exports.serialize = serialize;
//# sourceMappingURL=utils.js.map