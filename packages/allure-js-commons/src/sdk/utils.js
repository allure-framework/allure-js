import { LabelName, Status } from "../model.js";
export const getStatusFromError = (error) => {
    switch (true) {
        /**
         * Native `node:assert` and `chai` (`vitest` uses it under the hood) throw `AssertionError`
         * `jest` throws `JestAssertionError` instance
         * `jasmine` throws `ExpectationFailed` instance
         * `vitest` throws `Error` for extended assertions, so we look into stack
         */
        case /assert/gi.test(error.constructor.name):
        case /expectation/gi.test(error.constructor.name):
        case error.name && /assert/gi.test(error.name):
        case error.message && /assert/gi.test(error.message):
        case error.stack && /@vitest\/expect/gi.test(error.stack):
        case error.stack && /playwright\/lib\/matchers\/expect\.js/gi.test(error.stack):
        case "matcherResult" in error:
        case "inspect" in error && typeof error.inspect === "function":
            return Status.FAILED;
        default:
            return Status.BROKEN;
    }
};
/**
 * Source: https://github.com/chalk/ansi-regex
 */
const ansiRegex = ({ onlyFirst = false } = {}) => {
    const pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
    ].join("|");
    return new RegExp(pattern, onlyFirst ? undefined : "g");
};
/**
 * https://github.com/chalk/strip-ansi
 */
export const stripAnsi = (str) => {
    const regex = ansiRegex();
    return str.replace(regex, "");
};
const actualAndExpected = (value) => {
    if (!value || typeof value !== "object") {
        return {};
    }
    // support for jest asserts
    if ("matcherResult" in value && value.matcherResult !== undefined && typeof value.matcherResult === "object") {
        return {
            actual: serialize(value.matcherResult.actual),
            expected: serialize(value.matcherResult.expected),
        };
    }
    const actual = "actual" in value && value.actual !== undefined ? { actual: serialize(value.actual) } : {};
    const expected = "expected" in value && value.expected !== undefined ? { expected: serialize(value.expected) } : {};
    return {
        ...actual,
        ...expected,
    };
};
export const getMessageAndTraceFromError = (error) => {
    const { message, stack } = error;
    return {
        message: message ? stripAnsi(message) : undefined,
        trace: stack ? stripAnsi(stack) : undefined,
        ...actualAndExpected(error),
    };
};
export const allureMetadataRegexp = /(?:^|\s)@?allure\.(?<type>\S+)$/;
export const allureTitleMetadataRegexp = /(?:^|\s)@?allure\.(?<type>[^:=\s]+)[:=]("[^"]+"|'[^']+'|`[^`]+`|\S+)/;
export const allureTitleMetadataRegexpGlobal = new RegExp(allureTitleMetadataRegexp, "g");
export const allureIdRegexp = /(?:^|\s)@?allure\.id[:=](?<id>\S+)/;
export const allureLabelRegexp = /(?:^|\s)@?allure\.label\.(?<name>[^:=\s]+)[:=](?<value>[^\s]+)/;
export const getTypeFromAllureTitleMetadataMatch = (match) => {
    return match?.[1];
};
export const getValueFromAllureTitleMetadataMatch = (match) => {
    const quotesRegexp = /['"`]/;
    const quoteOpenRegexp = new RegExp(`^${quotesRegexp.source}`);
    const quoteCloseRegexp = new RegExp(`${quotesRegexp.source}$`);
    const matchedValue = match?.[2] ?? "";
    if (quoteOpenRegexp.test(matchedValue) && quoteCloseRegexp.test(matchedValue)) {
        return matchedValue.slice(1, -1);
    }
    return matchedValue;
};
export const isMetadataTag = (tag) => {
    return allureMetadataRegexp.test(tag);
};
export const getMetadataLabel = (tag, value) => {
    const match = tag.match(allureMetadataRegexp);
    const type = match?.groups?.type;
    if (!type) {
        return undefined;
    }
    const [subtype, name] = type.split(".");
    return {
        name: subtype === "id" ? LabelName.ALLURE_ID : name,
        value: value ?? "",
    };
};
export const extractMetadataFromString = (title) => {
    const labels = [];
    const links = [];
    const metadata = title.matchAll(allureTitleMetadataRegexpGlobal);
    const cleanTitle = title
        .replaceAll(allureTitleMetadataRegexpGlobal, "")
        .split(" ")
        .filter(Boolean)
        .reduce((acc, word) => {
        if (/^[\n\r]/.test(word)) {
            return acc + word;
        }
        return `${acc} ${word}`;
    }, "")
        .trim();
    for (const m of metadata) {
        const match = m;
        const type = getTypeFromAllureTitleMetadataMatch(match);
        const value = getValueFromAllureTitleMetadataMatch(match);
        if (!type || !value) {
            continue;
        }
        const [subtype, name] = type.split(".");
        switch (subtype) {
            case "id":
                labels.push({ name: LabelName.ALLURE_ID, value });
                break;
            case "label":
                labels.push({ name, value });
                break;
            case "link":
                links.push({ type: name, url: value });
                break;
        }
    }
    return {
        labels,
        links,
        cleanTitle,
    };
};
export const isAnyStepFailed = (item) => {
    const isFailed = item.status === Status.FAILED;
    if (isFailed || item.steps.length === 0) {
        return isFailed;
    }
    return !!item.steps.find((step) => isAnyStepFailed(step));
};
export const isAllStepsEnded = (item) => {
    return item.steps.every((val) => val.stop && isAllStepsEnded(val));
};
export const hasLabel = (testResult, labelName) => {
    return !!testResult.labels.find((l) => l.name === labelName);
};
export const hasStepMessage = (messages) => {
    return messages.some((message) => message.type === "step_start" || message.type === "step_stop");
};
export const getStepsMessagesPair = (messages) => messages.reduce((acc, message) => {
    if (message.type !== "step_start" && message.type !== "step_stop") {
        return acc;
    }
    if (message.type === "step_start") {
        acc.push([message]);
        return acc;
    }
    const unfinishedStepIdx = acc.findLastIndex((step) => step.length === 1);
    if (unfinishedStepIdx === -1) {
        return acc;
    }
    acc[unfinishedStepIdx].push(message);
    return acc;
}, []);
export const getUnfinishedStepsMessages = (messages) => {
    const grouppedStepsMessage = getStepsMessagesPair(messages);
    return grouppedStepsMessage.filter((step) => step.length === 1);
};
export const isPromise = (obj) => !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";
export const serialize = (value, { maxDepth = 0, maxLength = 0, replacer } = {}) => limitString(typeof value === "object" ? JSON.stringify(value, createSerializeReplacer(maxDepth, replacer)) : String(value), maxLength);
const createSerializeReplacer = (maxDepth, userDefinedReplacer) => {
    const parents = [];
    const limitingReplacer = function (_, value) {
        if (typeof value !== "object" || value === null) {
            return value;
        }
        while (parents.length > 0 && !Object.is(parents.at(-1), this)) {
            parents.pop();
        }
        if ((maxDepth && parents.length >= maxDepth) || parents.includes(value)) {
            return undefined;
        }
        parents.push(value);
        return value instanceof Map
            ? excludeCircularRefsFromMap(parents, value)
            : value instanceof Set
                ? excludeCircularRefsFromSet(parents, value)
                : value;
    };
    return userDefinedReplacer ? composeReplacers(userDefinedReplacer, limitingReplacer) : limitingReplacer;
};
const composeReplacers = (first, second) => function (k, v) {
    return second.call(this, k, first.call(this, k, v));
};
const excludeCircularRefsFromMap = (parents, map) => {
    return Array.from(map)
        .filter(([k]) => !parents.includes(k))
        .map(([k, v]) => [k, parents.includes(v) ? undefined : v]);
};
const excludeCircularRefsFromSet = (parents, set) => {
    return Array.from(set).map((v) => (parents.includes(v) ? undefined : v));
};
const limitString = (value, maxLength) => maxLength && value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
//# sourceMappingURL=utils.js.map