const NODE_TEST_ACTUAL_SPECIFIER = "node:test?allure-node-test-actual";
const NODE_TEST_WRAPPER_URL = "allure-node-test:node-test";

export const resolve = async (specifier: string, context: unknown, nextResolve: Function) => {
  if (specifier === NODE_TEST_ACTUAL_SPECIFIER) {
    return {
      shortCircuit: true,
      url: "node:test",
    };
  }

  if (specifier === "node:test") {
    return {
      shortCircuit: true,
      url: NODE_TEST_WRAPPER_URL,
    };
  }

  return nextResolve(specifier, context);
};

export const load = async (url: string, context: unknown, nextLoad: Function) => {
  if (url === NODE_TEST_WRAPPER_URL) {
    return {
      format: "module",
      shortCircuit: true,
      source: `
        import * as actual from ${JSON.stringify(NODE_TEST_ACTUAL_SPECIFIER)};
        import { applyNodeTestWrappers } from ${JSON.stringify(new URL("./testplan.js", import.meta.url).href)};

        const wrappers = applyNodeTestWrappers(actual);

        export default wrappers.test;
        export const test = wrappers.test;
        export const it = wrappers.it;
        export const describe = wrappers.describe;
        export const suite = wrappers.suite;
        export const before = wrappers.before;
        export const beforeEach = wrappers.beforeEach;
        export const after = wrappers.after;
        export const afterEach = wrappers.afterEach;
        export const run = actual.run;
        export const skip = actual.skip;
        export const todo = actual.todo;
        export const only = actual.only;
        export const mock = actual.mock;
        export const snapshot = actual.snapshot;
        export const assert = actual.assert;
      `,
    };
  }

  return nextLoad(url, context);
};
