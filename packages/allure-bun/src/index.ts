import type * as allure from "allure-js-commons";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";

import { finishFileContext } from "./lifecycle.js";
import { BunTestRuntime } from "./runtime.js";
import { createFileContext, createRunState } from "./state.js";
import type { BunFileContext, BunOriginals, BunWrappedFn } from "./types.js";
import {
  createSyntheticAfterEach,
  createSyntheticBeforeEach,
  createWrappedDescribe,
  createWrappedHook,
  createWrappedTest,
  throwConcurrentUnsupported,
} from "./wrappers.js";

type BunTestModule = typeof import("bun:test");

const copyMissingProperties = (target: BunWrappedFn, source: BunWrappedFn) => {
  for (const key of Object.getOwnPropertyNames(source)) {
    if (key in target) {
      continue;
    }

    const descriptor = Object.getOwnPropertyDescriptor(source, key);

    if (descriptor) {
      Object.defineProperty(target, key, descriptor);
    }
  }
};

export const installBunModuleMock = (bunTest: BunTestModule, allureModule: typeof allure) => {
  const runtime = new BunTestRuntime();
  const fileContexts = new Map<string, BunFileContext>();
  const runState = createRunState();
  const originals: BunOriginals = {
    beforeAll: (bunTest as any).beforeAll.bind(bunTest),
    afterAll: (bunTest as any).afterAll.bind(bunTest),
    beforeEach: (bunTest as any).beforeEach.bind(bunTest),
    afterEach: (bunTest as any).afterEach.bind(bunTest),
    describe: (bunTest as any).describe as BunWrappedFn,
    it: (bunTest as any).it as BunWrappedFn,
    test: (bunTest as any).test as BunWrappedFn,
  };
  let processExitHookRegistered = false;

  const activateFileContext = (fileContext: BunFileContext) => {
    runtime.setContext(fileContext);
  };

  const finishAllFileContexts = () => {
    for (const fileContext of fileContexts.values()) {
      finishFileContext(
        {
          activateFileContext,
          throwConcurrentUnsupported,
        },
        fileContext,
      );
    }
  };

  const ensureProcessExitHook = () => {
    if (processExitHookRegistered) {
      return;
    }

    processExitHookRegistered = true;
    process.once("beforeExit", finishAllFileContexts);
    process.once("exit", finishAllFileContexts);
  };

  const getFileContext = (filePath: string) => {
    const existing = fileContexts.get(filePath);

    if (existing) {
      return existing;
    }

    const created = createFileContext(filePath, runState);

    fileContexts.set(filePath, created);
    activateFileContext(created);
    originals.beforeEach(createSyntheticBeforeEach({ activateFileContext, getFileContext }, created));
    void Promise.resolve().then(() => {
      if (created.afterEachHookRegistered) {
        return;
      }

      created.afterEachHookRegistered = true;
      originals.afterEach(createSyntheticAfterEach(created));
    });
    ensureProcessExitHook();

    return created;
  };

  (globalThis as any).allure = allureModule;
  (globalThis as any).allureTestRuntime = () => runtime;
  setGlobalTestRuntime(runtime);

  const wrappedDescribe = createWrappedDescribe(originals.describe, { activateFileContext, getFileContext });
  const wrappedIt = createWrappedTest(originals.it, { activateFileContext, getFileContext });
  const wrappedTest = createWrappedTest(originals.test, { activateFileContext, getFileContext });

  // Bun exposes `test` and `it` as aliases, but their modifier props are not always symmetrical in CI.
  copyMissingProperties(wrappedTest, wrappedIt);
  copyMissingProperties(wrappedIt, wrappedTest);

  const mock = (bunTest as any).mock as {
    module: (name: string, factory: () => unknown) => void;
  };

  mock.module("bun:test", () => {
    return {
      ...bunTest,
      describe: wrappedDescribe,
      it: wrappedIt,
      test: wrappedTest,
      beforeAll: createWrappedHook(originals.beforeAll, { activateFileContext, getFileContext }, "beforeAll"),
      afterAll: createWrappedHook(originals.afterAll, { activateFileContext, getFileContext }, "afterAll"),
      beforeEach: createWrappedHook(originals.beforeEach, { activateFileContext, getFileContext }, "beforeEach"),
      afterEach: createWrappedHook(originals.afterEach, { activateFileContext, getFileContext }, "afterEach"),
    };
  });
};
