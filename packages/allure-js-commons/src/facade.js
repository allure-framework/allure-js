import { LabelName, LinkType } from "./model.js";
import { getGlobalTestRuntimeWithAutoconfig } from "./sdk/runtime/runtime.js";
import { isPromise } from "./sdk/utils.js";
const callRuntimeMethod = (method, ...args) => {
    const runtime = getGlobalTestRuntimeWithAutoconfig();
    if (!isPromise(runtime)) {
        // @ts-ignore
        return runtime[method](...args);
    }
    return runtime.then((testRuntime) => {
        // @ts-ignore
        return testRuntime[method](...args);
    });
};
export const label = (name, value) => {
    return callRuntimeMethod("labels", { name, value });
};
export const labels = (...labelsList) => {
    return callRuntimeMethod("labels", ...labelsList);
};
export const link = (url, name, type) => {
    return callRuntimeMethod("links", { url, type, name });
};
export const links = (...linksList) => {
    return callRuntimeMethod("links", ...linksList);
};
export const parameter = (name, value, options) => {
    return callRuntimeMethod("parameter", name, value, options);
};
export const description = (markdown) => {
    return callRuntimeMethod("description", markdown);
};
export const descriptionHtml = (html) => {
    return callRuntimeMethod("descriptionHtml", html);
};
export const displayName = (name) => {
    return callRuntimeMethod("displayName", name);
};
export const historyId = (value) => {
    return callRuntimeMethod("historyId", value);
};
export const testCaseId = (value) => {
    return callRuntimeMethod("testCaseId", value);
};
export const attachment = (name, content, options) => {
    const opts = typeof options === "string" ? { contentType: options } : options;
    return callRuntimeMethod("attachment", name, content, opts);
};
export const attachTrace = (name, path) => {
    return callRuntimeMethod("attachmentFromPath", name, path, {
        contentType: "application/vnd.allure.playwright-trace",
    });
};
export const attachmentPath = (name, path, options) => {
    const opts = typeof options === "string" ? { contentType: options } : options;
    return callRuntimeMethod("attachmentFromPath", name, path, opts);
};
const stepContext = () => ({
    displayName: (name) => {
        return callRuntimeMethod("stepDisplayName", name);
    },
    parameter: (name, value, mode) => {
        return callRuntimeMethod("stepParameter", name, value, mode);
    },
});
export const logStep = (name, status, error) => {
    return callRuntimeMethod("logStep", name, status, error);
};
export const step = (name, body) => {
    return callRuntimeMethod("step", name, () => body(stepContext()));
};
export const issue = (url, name) => link(url, name, LinkType.ISSUE);
export const tms = (url, name) => link(url, name, LinkType.TMS);
export const allureId = (value) => label(LabelName.ALLURE_ID, value);
export const epic = (name) => label(LabelName.EPIC, name);
export const feature = (name) => label(LabelName.FEATURE, name);
export const story = (name) => label(LabelName.STORY, name);
export const suite = (name) => label(LabelName.SUITE, name);
export const parentSuite = (name) => label(LabelName.PARENT_SUITE, name);
export const subSuite = (name) => label(LabelName.SUB_SUITE, name);
export const owner = (name) => label(LabelName.OWNER, name);
export const severity = (name) => label(LabelName.SEVERITY, name);
export const layer = (name) => label(LabelName.LAYER, name);
export const tag = (name) => label(LabelName.TAG, name);
export const tags = (...tagsList) => {
    return callRuntimeMethod("labels", ...tagsList.map((value) => ({ name: LabelName.TAG, value })));
};
//# sourceMappingURL=facade.js.map