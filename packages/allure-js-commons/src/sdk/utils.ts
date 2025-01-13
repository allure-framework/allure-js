import type { FixtureResult, Label, StatusDetails, StepResult, TestResult } from "../model.js";
import { LabelName, Status } from "../model.js";
import type { RuntimeMessage, SerializeOptions, SerializerReplacerFunc } from "./types.js";

export const getStatusFromError = (error: Partial<Error>): Status => {
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
export const stripAnsi = (str: string): string => {
  const regex = ansiRegex();
  return str.replace(regex, "");
};

export const getMessageAndTraceFromError = (error: Error | { message?: string; stack?: string }): StatusDetails => {
  const { message, stack } = error;
  const actual = "actual" in error && error.actual !== undefined ? { actual: serialize(error.actual) } : {};
  const expected = "expected" in error && error.expected !== undefined ? { expected: serialize(error.expected) } : {};
  return {
    message: message ? stripAnsi(message) : undefined,
    trace: stack ? stripAnsi(stack) : undefined,
    ...actual,
    ...expected,
  };
};

export const allureIdRegexp = /(?:^|\s)@?allure\.id[:=](?<id>[^\s]+)/;
export const allureIdRegexpGlobal = new RegExp(allureIdRegexp, "g");
export const allureLabelRegexp = /(?:^|\s)@?allure\.label\.(?<name>[^:=\s]+)[:=](?<value>[^\s]+)/;
export const allureLabelRegexpGlobal = new RegExp(allureLabelRegexp, "g");

export const isMetadataTag = (tag: string) => {
  return allureIdRegexp.test(tag) || allureLabelRegexp.test(tag);
};

export const extractMetadataFromString = (
  title: string,
): {
  labels: Label[];
  cleanTitle: string;
} => {
  const labels = [] as Label[];

  title.split(" ").forEach((val) => {
    const idValue = val.match(allureIdRegexp)?.groups?.id;

    if (idValue) {
      labels.push({ name: LabelName.ALLURE_ID, value: idValue });
    }

    const labelMatch = val.match(allureLabelRegexp);
    const { name, value } = labelMatch?.groups || {};

    if (name && value) {
      labels?.push({ name, value });
    }
  });

  const cleanTitle = title.replace(allureLabelRegexpGlobal, "").replace(allureIdRegexpGlobal, "").trim();

  return { labels, cleanTitle };
};

export const isAnyStepFailed = (item: StepResult | TestResult | FixtureResult): boolean => {
  const isFailed = item.status === Status.FAILED;

  if (isFailed || item.steps.length === 0) {
    return isFailed;
  }

  return !!item.steps.find((step) => isAnyStepFailed(step));
};

export const isAllStepsEnded = (item: StepResult | TestResult | FixtureResult): boolean => {
  return item.steps.every((val) => val.stop && isAllStepsEnded(val));
};

export const hasLabel = (testResult: TestResult, labelName: LabelName | string): boolean => {
  return !!testResult.labels.find((l) => l.name === labelName);
};

export const hasStepMessage = (messages: RuntimeMessage[]) => {
  return messages.some((message) => message.type === "step_start" || message.type === "step_stop");
};

export const getStepsMessagesPair = (messages: RuntimeMessage[]) =>
  messages.reduce((acc, message) => {
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
  }, [] as RuntimeMessage[][]);

export const getUnfinishedStepsMessages = (messages: RuntimeMessage[]) => {
  const grouppedStepsMessage = getStepsMessagesPair(messages);

  return grouppedStepsMessage.filter((step) => step.length === 1);
};

export const isPromise = <T = any>(obj: any): obj is PromiseLike<T> =>
  !!obj && (typeof obj === "object" || typeof obj === "function") && typeof obj.then === "function";

export const serialize = (value: any, { maxDepth = 0, maxLength = 0, replacer }: SerializeOptions = {}): string =>
  limitString(
    typeof value === "object" ? JSON.stringify(value, createSerializeReplacer(maxDepth, replacer)) : String(value),
    maxLength,
  );

const createSerializeReplacer = (maxDepth: number, userDefinedReplacer: SerializeOptions["replacer"]) => {
  const parents: unknown[] = [];
  const limitingReplacer = function (this: unknown, _: string, value: unknown) {
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

const composeReplacers = (first: SerializerReplacerFunc, second: SerializerReplacerFunc): SerializerReplacerFunc =>
  function (k, v) {
    return second.call(this, k, first.call(this, k, v));
  };

const excludeCircularRefsFromMap = (parents: any[], map: Map<any, any>) => {
  return Array.from(map)
    .filter(([k]) => !parents.includes(k))
    .map(([k, v]) => [k, parents.includes(v) ? undefined : v]);
};

const excludeCircularRefsFromSet = (parents: any[], set: Set<any>) => {
  return Array.from(set).map((v) => (parents.includes(v) ? undefined : v));
};

const limitString = (value: string, maxLength: number) =>
  maxLength && value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
