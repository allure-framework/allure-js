import type * as allure from "allure-js-commons";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";

import { finishFileContext, finishRunState } from "./lifecycle.js";
import { BunTestRuntime } from "./runtime.js";
import {
  createFileContext,
  createRunState,
  detectBunConcurrentMode,
  detectBunRandomizeMode,
  getBunReporterConfig,
} from "./state.js";
import type { BunFileContext, BunOriginals, BunWrappedFn } from "./types.js";
import {
  createSyntheticAfterAll,
  createSyntheticAfterEach,
  createSyntheticBeforeEach,
  createWrappedDescribe,
  createWrappedHook,
  createWrappedTest,
  throwRandomizeUnsupported,
  throwConcurrentUnsupported,
} from "./wrappers.js";

type BunTestModule = typeof import("bun:test");

export const installBunModuleMock = (
  bunTest: BunTestModule,
  allureModule: typeof allure,
  allureConfig = getBunReporterConfig(),
) => {
  if (detectBunConcurrentMode()) {
    throwConcurrentUnsupported();
  }

  if (detectBunRandomizeMode()) {
    throwRandomizeUnsupported();
  }

  const runState = createRunState(allureConfig);
  const testRuntime = new BunTestRuntime(runState);
  const fileContexts = new Map<string, BunFileContext>();
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
    testRuntime.setContext(fileContext);
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

    finishRunState(runState);
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
      if (!created.afterEachHookRegistered) {
        created.afterEachHookRegistered = true;
        originals.afterEach(createSyntheticAfterEach(created));
      }

      void Promise.resolve().then(() => {
        if (!created.afterAllHookRegistered) {
          created.afterAllHookRegistered = true;
          originals.afterAll(createSyntheticAfterAll({ activateFileContext, getFileContext }, created));
        }
      });
    });
    ensureProcessExitHook();

    return created;
  };

  (globalThis as any).allure = allureModule;
  (globalThis as any).allureTestRuntime = () => testRuntime;
  setGlobalTestRuntime(testRuntime);
  ensureProcessExitHook();

  const wrappedDescribe = createWrappedDescribe(originals.describe, { activateFileContext, getFileContext });
  const wrappedIt = createWrappedTest(originals.it, { activateFileContext, getFileContext }, [originals.test]);
  const wrappedTest = createWrappedTest(originals.test, { activateFileContext, getFileContext }, [originals.it]);

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
