import { hostname } from "node:os";
import path from "node:path";
import { env, pid } from "node:process";
import { isMainThread, threadId } from "node:worker_threads";
import { LabelName } from "../../../model.js";
import { getRelativePath } from "../utils.js";
const ENV_LABEL_PREFIX = "ALLURE_LABEL_";
export const getEnvironmentLabels = () => {
    const result = [];
    for (const envKey in env) {
        if (envKey.startsWith(ENV_LABEL_PREFIX)) {
            const name = envKey.substring(ENV_LABEL_PREFIX.length).trim();
            if (name !== "") {
                result.push({ name, value: process.env[envKey] });
            }
        }
    }
    return result;
};
let hostValue;
export const getHostLabel = () => {
    if (!hostValue) {
        hostValue = env.ALLURE_HOST_NAME ?? hostname();
    }
    return {
        name: LabelName.HOST,
        value: hostValue,
    };
};
export const getThreadLabel = (userProvidedThreadId) => {
    return {
        name: LabelName.THREAD,
        value: env.ALLURE_THREAD_NAME ??
            userProvidedThreadId ??
            `pid-${pid.toString()}-worker-${isMainThread ? "main" : threadId}`,
    };
};
export const getPackageLabel = (filepath) => ({
    name: LabelName.PACKAGE,
    value: getRelativePath(filepath)
        .split(path.sep)
        .filter((v) => v)
        .join("."),
});
export const getLanguageLabel = () => ({
    name: LabelName.LANGUAGE,
    value: "javascript",
});
export const getFrameworkLabel = (framework) => ({
    name: LabelName.FRAMEWORK,
    value: framework,
});
//# sourceMappingURL=labels.js.map