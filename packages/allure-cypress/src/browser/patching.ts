import { isPromise } from "allure-js-commons/sdk";
import type { CypressSuiteFunction, DirectHookImplementation, HookImplementation } from "../types.js";
import {
  completeSpecIfNoAfterHookLeft,
  completeSpecOnAfterHookFailure,
  throwAfterSpecCompletion,
} from "./lifecycle.js";

/**
 * Patches the `after` function, to inject reporting of spec-level
 * `after` hooks defined by the user.
 */
export const enableScopeLevelAfterHookReporting = () => {
  const [getSuiteDepth, incSuiteDepth, decSuiteDepth] = createSuiteDepthCounterState();
  patchDescribe(incSuiteDepth, decSuiteDepth);
  patchAfter(getSuiteDepth);
};

const createSuiteDepthCounterState = (): [get: () => number, inc: () => void, dec: () => void] => {
  let suiteDepth = 0;
  return [
    () => suiteDepth,
    () => {
      suiteDepth++;
    },
    () => {
      suiteDepth--;
    },
  ];
};

const patchDescribe = (incSuiteDepth: () => void, decSuiteDepth: () => void) => {
  const patchDescribeFn =
    (target: CypressSuiteFunction): CypressSuiteFunction =>
    (title, configOrFn, fn) => {
      incSuiteDepth();
      try {
        return forwardDescribeCall(target, title, configOrFn, fn);
      } finally {
        decSuiteDepth();
      }
    };
  const originalDescribeFn: Mocha.SuiteFunction = globalThis.describe;
  const patchedDescribe = patchDescribeFn(originalDescribeFn) as Mocha.SuiteFunction;
  patchedDescribe.only = patchDescribeFn(
    originalDescribeFn.only as CypressSuiteFunction,
  ) as Mocha.ExclusiveSuiteFunction;
  patchedDescribe.skip = patchDescribeFn(originalDescribeFn.skip as CypressSuiteFunction) as Mocha.PendingSuiteFunction;
  globalThis.describe = patchedDescribe;
};

const patchAfter = (getSuiteDepth: () => number) => {
  const originalAfter = globalThis.after;
  const patchedAfter = (nameOrFn: string | HookImplementation, fn?: HookImplementation): void => {
    return typeof nameOrFn === "string"
      ? originalAfter(nameOrFn, wrapRootAfterFn(getSuiteDepth, fn))
      : originalAfter(wrapRootAfterFn(getSuiteDepth, nameOrFn)!);
  };
  globalThis.after = patchedAfter;
};

const forwardDescribeCall = (target: CypressSuiteFunction, ...args: Parameters<CypressSuiteFunction>) => {
  const [title, configOrFn, fn] = args;
  if (typeof fn === "undefined" && typeof configOrFn === "undefined") {
    return target(title);
  } else if (typeof configOrFn === "function") {
    return target(title, configOrFn);
  } else {
    return target(title, configOrFn, fn);
  }
};

const wrapRootAfterFn = (getSuiteDepth: () => number, fn?: HookImplementation): HookImplementation | undefined => {
  if (getSuiteDepth() === 0 && fn) {
    const wrappedFn = fn.length ? wrapAfterFnWithCallback(fn) : wrapAfterFnWithoutArgs(fn as DirectHookImplementation);
    Object.defineProperty(wrappedFn, "name", { value: fn.name });
    return wrappedFn;
  }
  return fn;
};

const wrapAfterFnWithCallback = (fn: Mocha.Func): Mocha.Func => {
  return function (this: Mocha.Context, done: Mocha.Done) {
    const wrappedDone = (hookError?: Error) => {
      if (hookError) {
        if (!completeSpecOnAfterHookFailure(this, hookError)?.then(() => done(hookError))) {
          done(hookError);
        }
        return;
      }

      try {
        if (completeSpecIfNoAfterHookLeft(this)?.then(() => done())) {
          return;
        }
      } catch (allureError) {
        done(allureError);
        return;
      }

      done();
    };
    return fn.bind(this)(wrappedDone);
  };
};

const wrapAfterFnWithoutArgs = (fn: DirectHookImplementation) => {
  return function (this: Mocha.Context) {
    let result;
    let syncError: any;

    try {
      result = fn.bind(this)();
    } catch (e) {
      syncError = e;
    }

    if (syncError) {
      throwAfterSpecCompletion(this, syncError);
    } else if (isPromise(result)) {
      return result.then(
        () => completeSpecIfNoAfterHookLeft(this),
        (asyncError) => throwAfterSpecCompletion(this, asyncError),
      );
    } else {
      completeSpecIfNoAfterHookLeft(this);
      return result;
    }
  };
};
