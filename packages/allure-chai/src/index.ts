import { step } from "allure-js-commons/sync";

type ChaiStatic = typeof import("chai");
type ChaiUtils = ChaiStatic["util"];
type ChaiPlugin = (chai: ChaiStatic, utils: ChaiUtils) => void;
type Assertion = ReturnType<ChaiStatic["expect"]> & Record<PropertyKey, unknown>;
type AssertionMethod = (this: Assertion, ...args: unknown[]) => unknown;
type AssertionPrototype = Record<PropertyKey, unknown>;
type AssertStatic = Record<PropertyKey, unknown>;
type AnyFunction = ((...args: any[]) => any) & { name?: string; prototype?: unknown };
type AssertionType = "method" | "property" | "chainableMethod" | "assert";
type AssertionContext = {
  chai: ChaiStatic;
  utils?: ChaiUtils;
  assertion?: Assertion;
  assertionName: string;
  assertionType: AssertionType;
  args: readonly unknown[];
};

const ALLURE_CHAI_ASSERTION_PATCHED = Symbol.for("allure.chai.assertionPatched");
const ALLURE_CHAI_ASSERTION_STATIC_PATCHED = Symbol.for("allure.chai.assertionStaticPatched");
const ALLURE_CHAI_ASSERT_PATCHED = Symbol.for("allure.chai.assertPatched");
const ALLURE_CHAI_CHAINABLE_PATCHED = Symbol.for("allure.chai.chainablePatched");
const ALLURE_CHAI_WRAPPED = Symbol.for("allure.chai.wrapped");

const MAX_VALUE_LENGTH = 160;
const MAX_VALUE_DEPTH = 2;
const VITEST_TEST_FLAG = "vitest-test";
const VITEST_WITH_TEST_METHOD = "withTest";

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

const MODIFIER_CHAINS = new Set(["not", "deep", "nested", "own", "ordered", "any", "all", "itself"]);

const CHAINABLE_METHODS = new Set(["a", "an", "include", "contain", "contains", "includes", "length"]);

const HAVE_ASSERTIONS = new Set([
  "keys",
  "key",
  "lengthOf",
  "members",
  "property",
  "ownProperty",
  "ownPropertyDescriptor",
  "string",
]);

const BE_ASSERTIONS = new Set([
  "a",
  "an",
  "arguments",
  "Arguments",
  "empty",
  "exist",
  "exists",
  "extensible",
  "false",
  "finite",
  "frozen",
  "instanceOf",
  "instanceof",
  "NaN",
  "null",
  "ok",
  "sealed",
  "true",
  "undefined",
]);

const SKIPPED_ASSERTION_METHODS = new Set(["assert", "constructor"]);
const SKIPPED_ASSERTION_PROPERTIES = new Set(["_obj", "__flags", "__methods", "callable", "iterable", "numeric"]);
const SKIPPED_ASSERT_METHODS = new Set(["AssertionError"]);

const DISPLAY_NAMES = new Map([
  ["eq", "equal"],
  ["equals", "equal"],
  ["eqls", "eql"],
  ["contain", "include"],
  ["contains", "include"],
  ["includes", "include"],
  ["exists", "exist"],
  ["matches", "match"],
  ["throws", "throw"],
  ["Throw", "throw"],
  ["greaterThan", "above"],
  ["greaterThanOrEqual", "least"],
  ["gt", "above"],
  ["lessThan", "below"],
  ["lessThanOrEqual", "most"],
  ["lt", "below"],
  ["gte", "least"],
  ["lte", "most"],
  ["instanceof", "instanceOf"],
  ["haveOwnProperty", "ownProperty"],
  ["haveOwnPropertyDescriptor", "ownPropertyDescriptor"],
  ["respondsTo", "respondTo"],
  ["satisfies", "satisfy"],
]);

let suppressedAssertionSteps = 0;

const isWrapped = (value: unknown) => typeof value === "function" && Boolean((value as any)[ALLURE_CHAI_WRAPPED]);

const markWrapped = <T extends AnyFunction>(value: T): T => {
  Object.defineProperty(value, ALLURE_CHAI_WRAPPED, {
    value: true,
  });

  return value;
};

const withSuppressedAssertionSteps = <T>(body: () => T): T => {
  suppressedAssertionSteps += 1;
  try {
    return body();
  } finally {
    suppressedAssertionSteps -= 1;
  }
};

const shouldSuppressAssertionSteps = () => suppressedAssertionSteps > 0;

const limitString = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}... <truncated>` : value;

const formatFunction = (value: AnyFunction) => {
  if (value.prototype instanceof Error) {
    return value.name || "Error";
  }

  return value.name ? `[Function ${value.name}]` : "[Function]";
};

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

  try {
    return limitString(JSON.stringify(value, createJsonReplacer()) ?? String(value), MAX_VALUE_LENGTH);
  } catch {
    return limitString(String(value), MAX_VALUE_LENGTH);
  }
};

const formatArguments = (args: unknown[]) => args.map(formatValue).join(", ");

const getFlag = (utils: ChaiUtils, assertion: Assertion, name: string) => Boolean(utils.flag(assertion, name));

const hasFlag = (utils: ChaiUtils, assertion: Assertion, name: string) => utils.flag(assertion, name) !== undefined;

// Vitest marks its expect chain with this flag via withTest; the setup call itself has to be suppressed by name.
const isVitestOwnedAssertion = ({ assertion, assertionName, utils }: AssertionContext) =>
  assertion && utils ? assertionName === VITEST_WITH_TEST_METHOD || hasFlag(utils, assertion, VITEST_TEST_FLAG) : false;

const isChaiLikeObject = (value: unknown): value is Partial<ChaiStatic> =>
  (typeof value === "object" && value !== null) || typeof value === "function";

const isSameChaiInstance = (candidate: unknown, chai: ChaiStatic) => {
  if (candidate === chai) {
    return true;
  }

  return (
    isChaiLikeObject(candidate) &&
    candidate.Assertion === chai.Assertion &&
    candidate.assert === chai.assert &&
    candidate.expect === chai.expect
  );
};

const isCypressOwnedChai = (chai: ChaiStatic) =>
  Boolean(Reflect.get(globalThis, "Cypress") && isSameChaiInstance(Reflect.get(globalThis, "chai"), chai));

const shouldReportAssertion = (context: AssertionContext) => {
  if (isVitestOwnedAssertion(context)) {
    return false;
  }

  if (isCypressOwnedChai(context.chai)) {
    return false;
  }

  return true;
};

const getModifiers = (utils: ChaiUtils, assertion: Assertion, displayName: string) => {
  const modifiers: string[] = [];

  if (getFlag(utils, assertion, "negate")) {
    modifiers.push("not");
  }
  if (displayName !== "include" && getFlag(utils, assertion, "contains")) {
    modifiers.push("include");
  }
  for (const flagName of ["deep", "nested", "own", "ordered", "any", "all"] as const) {
    if (getFlag(utils, assertion, flagName)) {
      modifiers.push(flagName);
    }
  }

  return modifiers;
};

const getAssertionPath = (utils: ChaiUtils, assertion: Assertion, assertionName: string) => {
  const displayName = DISPLAY_NAMES.get(assertionName) ?? assertionName;
  const parts = ["to", ...getModifiers(utils, assertion, displayName)];
  const isIncludeAssertion = parts.includes("include");

  if (HAVE_ASSERTIONS.has(displayName) && !isIncludeAssertion) {
    parts.push("have");
  } else if (BE_ASSERTIONS.has(displayName)) {
    parts.push("be");
  }

  parts.push(displayName);

  return parts.join(".");
};

const buildExpectStepName = (
  utils: ChaiUtils,
  assertion: Assertion,
  assertionName: string,
  args: unknown[],
  isProperty: boolean,
) => {
  const actual = formatValue(utils.flag(assertion, "object"));
  const path = getAssertionPath(utils, assertion, assertionName);
  const serializedArgs = formatArguments(args);
  const argsSuffix = isProperty ? "" : `(${serializedArgs})`;

  return `expect(${actual}).${path}${argsSuffix}`;
};

const buildAssertStepName = (assertionName: string, args: unknown[]) =>
  `assert.${assertionName}(${formatArguments(args)})`;

const runAssertionStep = <T>(name: string, body: () => T) => {
  if (shouldSuppressAssertionSteps()) {
    return body();
  }

  return step(name, body);
};

const wrapAssertionMethod = (
  chai: ChaiStatic,
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
    const shouldReport = shouldReportAssertion({
      args,
      assertion: this,
      assertionName,
      assertionType: "method",
      chai,
      utils,
    });

    if (!shouldReport) {
      return withSuppressedAssertionSteps(() => original.apply(this, args));
    }

    return runAssertionStep(buildExpectStepName(utils, this, assertionName, args, false), () =>
      original.apply(this, args),
    );
  });

  Object.defineProperty(prototype, assertionName, {
    ...descriptor,
    value: wrapped,
  });
};

const wrapChainableMethod = (chai: ChaiStatic, utils: ChaiUtils, assertionName: string) => {
  const prototype = chai.Assertion.prototype as unknown as AssertionPrototype;
  const patchedNames = (prototype[ALLURE_CHAI_CHAINABLE_PATCHED] ??= new Set<string>()) as Set<string>;

  if (patchedNames.has(assertionName)) {
    return;
  }

  patchedNames.add(assertionName);

  (chai.Assertion as any).overwriteChainableMethod(
    assertionName,
    (original: AssertionMethod) =>
      markWrapped(function (this: Assertion, ...args: unknown[]) {
        const shouldReport = shouldReportAssertion({
          args,
          assertion: this,
          assertionName,
          assertionType: "chainableMethod",
          chai,
          utils,
        });

        if (!shouldReport) {
          return withSuppressedAssertionSteps(() => original.apply(this, args));
        }

        return runAssertionStep(buildExpectStepName(utils, this, assertionName, args, false), () =>
          original.apply(this, args),
        );
      }),
    (original: (this: Assertion) => unknown) =>
      function (this: Assertion) {
        return original.call(this);
      },
  );
};

const wrapAssertionProperty = (
  chai: ChaiStatic,
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
    const args: unknown[] = [];
    const shouldReport = shouldReportAssertion({
      args,
      assertion: this,
      assertionName,
      assertionType: "property",
      chai,
      utils,
    });

    if (!shouldReport) {
      return withSuppressedAssertionSteps(() => originalGet.call(this));
    }

    return runAssertionStep(buildExpectStepName(utils, this, assertionName, args, true), () => originalGet.call(this));
  });

  Object.defineProperty(prototype, assertionName, {
    ...descriptor,
    get: wrappedGet,
  });
};

const instrumentAssertionPrototype = (chai: ChaiStatic, utils: ChaiUtils) => {
  const prototype = chai.Assertion.prototype as unknown as AssertionPrototype;

  if (prototype[ALLURE_CHAI_ASSERTION_PATCHED]) {
    return;
  }

  Object.defineProperty(prototype, ALLURE_CHAI_ASSERTION_PATCHED, {
    value: true,
  });

  for (const assertionName of Object.getOwnPropertyNames(prototype)) {
    if (SKIPPED_ASSERTION_METHODS.has(assertionName) || SKIPPED_ASSERTION_PROPERTIES.has(assertionName)) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(prototype, assertionName);
    if (!descriptor) {
      continue;
    }

    if (typeof descriptor.value === "function") {
      wrapAssertionMethod(chai, utils, prototype, assertionName, descriptor);
      continue;
    }

    if (!descriptor.get || LANGUAGE_CHAINS.has(assertionName) || MODIFIER_CHAINS.has(assertionName)) {
      continue;
    }

    if (CHAINABLE_METHODS.has(assertionName)) {
      wrapChainableMethod(chai, utils, assertionName);
      continue;
    }

    wrapAssertionProperty(chai, utils, prototype, assertionName, descriptor);
  }
};

const instrumentAssertionStatic = (chai: ChaiStatic, utils: ChaiUtils) => {
  const Assertion = chai.Assertion as unknown as Record<string | symbol, unknown>;
  const prototype = chai.Assertion.prototype as unknown as AssertionPrototype;

  if (Assertion[ALLURE_CHAI_ASSERTION_STATIC_PATCHED]) {
    return;
  }

  Object.defineProperty(Assertion, ALLURE_CHAI_ASSERTION_STATIC_PATCHED, {
    value: true,
  });

  const patchStatic = (
    name: "addMethod" | "addProperty" | "addChainableMethod",
    wrap: (assertionName: string) => void,
  ) => {
    const original = Assertion[name];

    if (typeof original !== "function" || isWrapped(original)) {
      return;
    }

    const wrapped = markWrapped(function (this: unknown, assertionName: string, ...args: unknown[]) {
      const result = original.call(this, assertionName, ...args);
      wrap(assertionName);

      return result;
    });

    Assertion[name] = wrapped;
  };

  patchStatic("addMethod", (assertionName) => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, assertionName);
    if (descriptor) {
      wrapAssertionMethod(chai, utils, prototype, assertionName, descriptor);
    }
  });
  patchStatic("addProperty", (assertionName) => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, assertionName);
    if (descriptor) {
      wrapAssertionProperty(chai, utils, prototype, assertionName, descriptor);
    }
  });
  patchStatic("addChainableMethod", (assertionName) => wrapChainableMethod(chai, utils, assertionName));
};

const instrumentAssert = (chai: ChaiStatic) => {
  const assert = chai.assert as unknown as AssertStatic;

  if (assert[ALLURE_CHAI_ASSERT_PATCHED]) {
    return;
  }

  Object.defineProperty(assert, ALLURE_CHAI_ASSERT_PATCHED, {
    value: true,
  });

  for (const assertionName of Object.getOwnPropertyNames(assert)) {
    if (SKIPPED_ASSERT_METHODS.has(assertionName)) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(assert, assertionName);
    if (!descriptor || typeof descriptor.value !== "function" || isWrapped(descriptor.value)) {
      continue;
    }

    const original = descriptor.value as (...args: unknown[]) => unknown;
    const wrapped = markWrapped(function (this: unknown, ...args: unknown[]) {
      const shouldReport = shouldReportAssertion({
        args,
        assertionName,
        assertionType: "assert",
        chai,
      });

      if (!shouldReport) {
        return withSuppressedAssertionSteps(() => original.apply(this, args));
      }

      return runAssertionStep(buildAssertStepName(assertionName, args), () =>
        withSuppressedAssertionSteps(() => original.apply(this, args)),
      );
    });

    Object.defineProperty(assert, assertionName, {
      ...descriptor,
      value: wrapped,
    });
  }
};

export const allureChai: ChaiPlugin = (chai, utils) => {
  instrumentAssertionPrototype(chai, utils);
  instrumentAssertionStatic(chai, utils);
  instrumentAssert(chai);
};
