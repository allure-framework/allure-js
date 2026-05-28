import { Status } from "allure-js-commons";
import { type RuntimeMessage, getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import { getGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import type { TaskMeta } from "vitest";
import { chai } from "vitest";

import { markAsMatcherMessage } from "./matcherMessages.js";
import { getCurrentTask } from "./runtime.js";

type ChaiStatic = typeof chai;
type ChaiUtils = ChaiStatic["util"];
type Assertion = ReturnType<ChaiStatic["expect"]> & Record<PropertyKey, unknown>;
type AssertionMethod = (this: Assertion, ...args: unknown[]) => unknown;
type AssertionPrototype = Record<PropertyKey, unknown>;
type AnyFunction = ((...args: unknown[]) => unknown) & { name?: string; prototype?: unknown };
type VitestTask = {
  meta?: TaskMeta;
  result?: {
    errors?: unknown[];
  };
};
type RuntimeMessageSender = {
  sendMessageSync?: (message: RuntimeMessage) => void;
  sendMessage?: (message: RuntimeMessage) => PromiseLike<void> | void;
};
type AsymmetricMatcher = {
  $$typeof?: unknown;
  sample?: unknown;
  inverse?: boolean;
  precision?: unknown;
  constructor?: {
    name?: string;
  };
  toString?: () => string;
};
type StepStop = (status: Status, error?: unknown) => void;

const ALLURE_VITEST_EXPECT_PATCHED = Symbol.for("allure.vitest.expectPatched");
const ALLURE_VITEST_EXPECT_EXTEND_PATCHED = Symbol.for("allure.vitest.expectExtendPatched");
const ALLURE_VITEST_EXPECT_WRAPPED = Symbol.for("allure.vitest.expectWrapped");

const MAX_VALUE_LENGTH = 160;
const MAX_VALUE_DEPTH = 2;
const ACTIVE_MATCHER_STEP_FLAG = "allure-vitest-active-matcher-step";
const JEST_ASYMMETRIC_MATCHER = Symbol.for("jest.asymmetricMatcher");
// Vitest doesn't expose a public marker for "this Chai assertion came from Vitest expect".
// Its expect() implementation marks those assertions through withTest() with this flag;
// we only read it and let Vitest remain the owner of the flag.
const VITEST_TEST_FLAG = "vitest-test";

const LANGUAGE_CHAINS = new Set([
  "to",
  "be",
  "been",
  "is",
  "and",
  "has",
  "have",
  "with",
  "that",
  "which",
  "at",
  "of",
  "same",
  "but",
  "does",
  "still",
  "also",
]);

const MODIFIER_CHAINS = new Set([
  "not",
  "deep",
  "nested",
  "own",
  "ordered",
  "any",
  "all",
  "itself",
  "resolves",
  "rejects",
]);

const SKIPPED_ASSERTION_METHODS = new Set(["assert", "constructor", "withContext", "withTest",  "toMatchInlineSnapshot", "toMatchSnapshot"]);
const SKIPPED_ASSERTION_PROPERTIES = new Set(["_obj", "__flags", "__methods", "callable", "iterable", "numeric"]);
const ASYMMETRIC_MATCHER_FACTORIES = new Map([
  ["ArrayContaining", "arrayContaining"],
  ["ObjectContaining", "objectContaining"],
  ["SchemaMatching", "schemaMatching"],
  ["StringContaining", "stringContaining"],
  ["StringMatching", "stringMatching"],
]);

const isWrapped = (value: unknown) =>
  typeof value === "function" &&
  Boolean((value as unknown as Record<PropertyKey, unknown>)[ALLURE_VITEST_EXPECT_WRAPPED]);

const isAsymmetricMatcher = (value: unknown): value is AsymmetricMatcher =>
  Boolean(value && typeof value === "object" && (value as AsymmetricMatcher).$$typeof === JEST_ASYMMETRIC_MATCHER);

const markWrapped = <T extends AnyFunction>(value: T): T => {
  Object.defineProperty(value, ALLURE_VITEST_EXPECT_WRAPPED, {
    value: true,
  });

  return value;
};

const limitString = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}... <truncated>` : value;

const formatFunction = (value: AnyFunction) => {
  if (value.prototype instanceof Error) {
    return value.name || "Error";
  }

  return value.name ? `[Function ${value.name}]` : "[Function]";
};

const getAsymmetricMatcherName = (value: AsymmetricMatcher): string | undefined => {
  try {
    return value.toString?.();
  } catch {
    return undefined;
  }
};

const isMatcherPath = (value: string) => /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(value);

function formatAsymmetricMatcher(value: AsymmetricMatcher): string {
  const constructorName = value.constructor?.name;
  const inversePrefix = value.inverse ? "not." : "";

  if (constructorName === "Any") {
    const sample = value.sample;
    const type = typeof sample === "function" && sample.name ? sample.name : formatValue(sample);

    return `expect.${inversePrefix}any(${type})`;
  }

  if (constructorName === "Anything") {
    return `expect.${inversePrefix}anything()`;
  }

  if (constructorName === "CloseTo") {
    const args = [value.sample, value.precision]
      .filter((arg) => arg !== undefined)
      .map(formatValue)
      .join(", ");

    return `expect.${inversePrefix}closeTo(${args})`;
  }

  if (constructorName === "CustomMatcher") {
    const matcherName = getAsymmetricMatcherName(value);

    if (matcherName && isMatcherPath(matcherName)) {
      const args = Array.isArray(value.sample) ? value.sample.map(formatValue).join(", ") : "";

      return `expect.${matcherName}(${args})`;
    }
  }

  const factoryName = constructorName ? ASYMMETRIC_MATCHER_FACTORIES.get(constructorName) : undefined;

  if (factoryName) {
    return `expect.${inversePrefix}${factoryName}(${formatValue(value.sample)})`;
  }

  const matcherName = getAsymmetricMatcherName(value);

  if (matcherName) {
    return matcherName;
  }

  return "expect.asymmetricMatcher";
}

const createJsonReplacer = () => {
  const parents: unknown[] = [];

  return function (this: unknown, _: string, value: unknown): unknown {
    if (typeof value === "bigint") {
      return `${value}n`;
    }

    if (typeof value === "function") {
      return formatFunction(value as AnyFunction);
    }

    if (typeof value === "symbol") {
      return value.toString();
    }

    if (value instanceof RegExp) {
      return value.toString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
      };
    }

    if (isAsymmetricMatcher(value)) {
      return formatAsymmetricMatcher(value);
    }

    if (!value || typeof value !== "object") {
      return value;
    }

    while (parents.length > 0 && !Object.is(parents[parents.length - 1], this)) {
      parents.pop();
    }

    if (parents.includes(value)) {
      return "[Circular]";
    }

    if (parents.length >= MAX_VALUE_DEPTH) {
      return Array.isArray(value) ? "[Array]" : "[Object]";
    }

    parents.push(value);

    return value;
  };
};

const formatValue = (value: unknown): string => {
  if (typeof value === "string") {
    return limitString(JSON.stringify(value), MAX_VALUE_LENGTH);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return formatFunction(value as AnyFunction);
  }

  if (isAsymmetricMatcher(value)) {
    return limitString(formatAsymmetricMatcher(value), MAX_VALUE_LENGTH);
  }

  try {
    return limitString(JSON.stringify(value, createJsonReplacer()) ?? String(value), MAX_VALUE_LENGTH);
  } catch {
    return limitString(String(value), MAX_VALUE_LENGTH);
  }
};

const formatArguments = (args: unknown[]) => args.map(formatValue).join(", ");

const getCurrentVitestTask = (): VitestTask | undefined => {
  const task = getCurrentTask() as VitestTask | undefined;

  return task?.meta ? task : undefined;
};

// In concurrent tests, Vitest's process-global getCurrentTest() can be reset after an awaited gap,
// so expect() may skip withTest() even though the assertion is still running inside a known test task.
// Keep that recovery narrow to Vitest/Jest-style matcher names so raw Chai methods like equal()
// remain ignored.
const canRecoverVitestTaskFromAsyncContext = (assertionName: string) => assertionName.startsWith("to");

const getVitestTask = (utils: ChaiUtils, assertion: Assertion, assertionName: string): VitestTask | undefined => {
  const flaggedTask = utils.flag(assertion, VITEST_TEST_FLAG) as VitestTask | undefined;
  const currentTask = getCurrentVitestTask();

  if (!flaggedTask?.meta) {
    return canRecoverVitestTaskFromAsyncContext(assertionName) ? currentTask : undefined;
  }

  return currentTask ?? flaggedTask;
};

const countErrors = (task: VitestTask | undefined) => task?.result?.errors?.length ?? 0;

const getNewSoftAssertionError = (task: VitestTask | undefined, beforeErrors: number) => {
  const errors = task?.result?.errors;

  return errors && errors.length > beforeErrors ? errors[errors.length - 1] : undefined;
};

const sendMatcherMessage = (message: RuntimeMessage) => {
  const runtime = getGlobalTestRuntime() as RuntimeMessageSender;
  const matcherMessage = markAsMatcherMessage(message);

  if (runtime.sendMessageSync) {
    runtime.sendMessageSync(matcherMessage);
    return;
  }

  void runtime.sendMessage?.(matcherMessage);
};

const startMatcherStep = (name: string): StepStop => {
  sendMatcherMessage({
    type: "step_start",
    data: {
      name,
      start: Date.now(),
    },
  });

  let stopped = false;

  return (status, error) => {
    if (stopped) {
      return;
    }

    stopped = true;
    sendMatcherMessage({
      type: "step_stop",
      data: {
        status,
        stop: Date.now(),
        statusDetails: error ? getMessageAndTraceFromError(error as Error) : undefined,
      },
    });
  };
};

const isPromise = (value: unknown): value is Promise<unknown> => value instanceof Promise;

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  Boolean(
    value &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as PromiseLike<unknown>).then === "function",
  );

const observePromise = <T>(promise: Promise<T>, stop: StepStop) => {
  void promise.then(
    () => stop(Status.PASSED),
    (error) => {
      stop(getStatusFromError(error as Error), error);
    },
  );

  return promise;
};

const observeThenable = <T>(thenable: PromiseLike<T>, stop: StepStop) => {
  try {
    void thenable.then(
      () => stop(Status.PASSED),
      (error) => {
        stop(getStatusFromError(error as Error), error);
      },
    );
  } catch (error) {
    stop(getStatusFromError(error as Error), error);
  }

  return thenable;
};

const restoreActiveMatcherFlag = (utils: ChaiUtils, assertion: Assertion, previousValue: unknown) => {
  utils.flag(assertion, ACTIVE_MATCHER_STEP_FLAG, previousValue);
};

const isMatcherStepActive = (utils: ChaiUtils, assertion: Assertion) =>
  Boolean(utils.flag(assertion, ACTIVE_MATCHER_STEP_FLAG));

const runWithNestedMatcherStepsSuppressed = <T>(utils: ChaiUtils, assertion: Assertion, body: () => T): T => {
  const previousValue = utils.flag(assertion, ACTIVE_MATCHER_STEP_FLAG);

  utils.flag(assertion, ACTIVE_MATCHER_STEP_FLAG, true);

  try {
    const result = body();

    if (isPromise(result)) {
      void result.then(
        () => restoreActiveMatcherFlag(utils, assertion, previousValue),
        () => restoreActiveMatcherFlag(utils, assertion, previousValue),
      );
      return result;
    }

    if (isThenable(result)) {
      try {
        void result.then(
          () => restoreActiveMatcherFlag(utils, assertion, previousValue),
          () => restoreActiveMatcherFlag(utils, assertion, previousValue),
        );
      } catch {
        restoreActiveMatcherFlag(utils, assertion, previousValue);
      }

      return result;
    }

    restoreActiveMatcherFlag(utils, assertion, previousValue);
    return result;
  } catch (error) {
    restoreActiveMatcherFlag(utils, assertion, previousValue);
    throw error;
  }
};

const buildMatcherStepName = (
  utils: ChaiUtils,
  assertion: Assertion,
  assertionName: string,
  args: unknown[],
  isProperty: boolean,
) => {
  const actual = formatValue(utils.flag(assertion, "object"));
  const promise = utils.flag(assertion, "promise") as string | undefined;
  const parts = [];

  if (promise) {
    parts.push(promise);
  }

  if (utils.flag(assertion, "negate")) {
    parts.push("not");
  }

  parts.push(assertionName);

  const argsSuffix = isProperty ? "" : `(${formatArguments(args)})`;

  return `expect(${actual}).${parts.join(".")}${argsSuffix}`;
};

const runMatcherStep = <T>(
  task: VitestTask,
  name: string,
  body: () => T,
): T | PromiseLike<Awaited<T>> | Promise<Awaited<T>> => {
  const stop = startMatcherStep(name);
  const beforeErrors = countErrors(task);

  try {
    const result = body();

    if (isPromise(result)) {
      return observePromise(result, stop) as Promise<Awaited<T>>;
    }

    if (isThenable(result)) {
      return observeThenable(result as PromiseLike<Awaited<T>>, stop);
    }

    const softAssertionError = getNewSoftAssertionError(task, beforeErrors);

    if (softAssertionError) {
      stop(getStatusFromError(softAssertionError as Error), softAssertionError);
    } else {
      stop(Status.PASSED);
    }

    return result;
  } catch (error) {
    stop(getStatusFromError(error as Error), error);
    throw error;
  }
};

const wrapAssertionMethod = (
  utils: ChaiUtils,
  prototype: AssertionPrototype,
  assertionName: string,
  descriptor: PropertyDescriptor,
) => {
  const original = descriptor.value as AssertionMethod;

  if (isWrapped(original)) {
    return;
  }

  const wrapped = markWrapped(function (this: Assertion, ...args: unknown[]) {
    if (isMatcherStepActive(utils, this)) {
      return original.apply(this, args);
    }

    const task = getVitestTask(utils, this, assertionName);

    if (!task || utils.flag(this, "poll")) {
      return original.apply(this, args);
    }

    return runMatcherStep(task, buildMatcherStepName(utils, this, assertionName, args, false), () =>
      runWithNestedMatcherStepsSuppressed(utils, this, () => original.apply(this, args)),
    );
  });

  Object.defineProperty(prototype, assertionName, {
    ...descriptor,
    value: wrapped,
  });
};

const wrapAssertionProperty = (
  utils: ChaiUtils,
  prototype: AssertionPrototype,
  assertionName: string,
  descriptor: PropertyDescriptor,
) => {
  const originalGet = descriptor.get;

  if (!originalGet || isWrapped(originalGet)) {
    return;
  }

  const wrappedGet = markWrapped(function (this: Assertion) {
    if (isMatcherStepActive(utils, this)) {
      return originalGet.call(this);
    }

    const task = getVitestTask(utils, this, assertionName);

    if (!task || utils.flag(this, "poll")) {
      return originalGet.call(this);
    }

    return runMatcherStep(task, buildMatcherStepName(utils, this, assertionName, [], true), () =>
      runWithNestedMatcherStepsSuppressed(utils, this, () => originalGet.call(this)),
    );
  });

  Object.defineProperty(prototype, assertionName, {
    ...descriptor,
    get: wrappedGet,
  });
};

const wrapDescriptor = (utils: ChaiUtils, prototype: AssertionPrototype, assertionName: string) => {
  if (SKIPPED_ASSERTION_METHODS.has(assertionName) || SKIPPED_ASSERTION_PROPERTIES.has(assertionName)) {
    return;
  }

  const descriptor = Object.getOwnPropertyDescriptor(prototype, assertionName);

  if (!descriptor) {
    return;
  }

  if (typeof descriptor.value === "function") {
    wrapAssertionMethod(utils, prototype, assertionName, descriptor);
    return;
  }

  if (!descriptor.get || LANGUAGE_CHAINS.has(assertionName) || MODIFIER_CHAINS.has(assertionName)) {
    return;
  }

  wrapAssertionProperty(utils, prototype, assertionName, descriptor);
};

const instrumentWithTest = (prototype: AssertionPrototype) => {
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "withTest");
  const original = descriptor?.value as AssertionMethod | undefined;

  if (!descriptor || typeof original !== "function" || isWrapped(original)) {
    return;
  }

  const wrapped = markWrapped(function (this: Assertion, task?: unknown, ...args: unknown[]) {
    return original.call(this, getCurrentVitestTask() ?? task, ...args);
  });

  Object.defineProperty(prototype, "withTest", {
    ...descriptor,
    value: wrapped,
  });
};

const instrumentExistingAssertions = (utils: ChaiUtils, prototype: AssertionPrototype) => {
  if (prototype[ALLURE_VITEST_EXPECT_PATCHED]) {
    return;
  }

  Object.defineProperty(prototype, ALLURE_VITEST_EXPECT_PATCHED, {
    value: true,
  });

  for (const assertionName of Object.getOwnPropertyNames(prototype)) {
    wrapDescriptor(utils, prototype, assertionName);
  }
};

const instrumentExpectExtend = (utils: ChaiUtils, prototype: AssertionPrototype) => {
  const expectStatic = chai.expect as unknown as Record<PropertyKey, unknown>;

  if (expectStatic[ALLURE_VITEST_EXPECT_EXTEND_PATCHED]) {
    return;
  }

  Object.defineProperty(expectStatic, ALLURE_VITEST_EXPECT_EXTEND_PATCHED, {
    value: true,
  });

  const descriptor = Object.getOwnPropertyDescriptor(expectStatic, "extend");
  const original = descriptor?.value;

  if (!descriptor || typeof original !== "function" || isWrapped(original)) {
    return;
  }

  const wrapped = markWrapped(function (this: unknown, ...args: unknown[]) {
    const result = original.apply(this, args);

    for (const matchers of args) {
      if (matchers && typeof matchers === "object") {
        Object.keys(matchers).forEach((assertionName) => wrapDescriptor(utils, prototype, assertionName));
      }
    }

    return result;
  });

  Object.defineProperty(expectStatic, "extend", {
    ...descriptor,
    value: wrapped,
  });
};

export const registerAllureVitestExpect = () => {
  const prototype = chai.Assertion.prototype as unknown as AssertionPrototype;

  instrumentWithTest(prototype);
  instrumentExistingAssertions(chai.util, prototype);
  instrumentExpectExtend(chai.util, prototype);
};
