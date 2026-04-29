import type { Parameter } from "allure-js-commons";
import { serialize } from "allure-js-commons/sdk";

import { CONCURRENT_UNSUPPORTED_MESSAGE, RANDOMIZE_UNSUPPORTED_MESSAGE } from "./constants.js";
import {
  emitStaticTest,
  ensureCurrentTest,
  executeHook,
  executeWrappedTest,
  finalizeTest,
  finishFileContext,
} from "./lifecycle.js";
import {
  combineModes,
  createDescribeBlock,
  createTestEntry,
  getCallerFilePath,
  getCurrentRegistrationSuite,
  getSuiteMode,
  isTestSelectedByBunNamePattern,
  isTestSelectedByPlan,
  markSuiteSelected,
  resolveTestBehavior,
} from "./state.js";
import { formatEachTitle, normalizeEachRows } from "./titleFormat.js";
import type {
  BunFileContext,
  BunHookType,
  BunOriginalFn,
  BunRegisteredTest,
  BunStaticMode,
  BunTestBehavior,
  BunWrappedFn,
} from "./types.js";

type BunWrapperDeps = {
  activateFileContext: (fileContext: BunFileContext) => void;
  getFileContext: (filePath: string) => BunFileContext;
};

type TestWrapperConfig = {
  behavior: BunTestBehavior;
  mode?: BunStaticMode;
};

type DescribeWrapperConfig = {
  mode?: BunStaticMode;
};

type WrapOptions = {
  allowModifiers: boolean;
};

const unsupportedModifierMarker = Symbol("allureBunUnsupportedModifier");

const getCallableProp = (source: Record<string, unknown>, key: string) => {
  try {
    const value = source[key];
    return typeof value === "function" ? value : undefined;
  } catch {
    return undefined;
  }
};

export const isUnsupportedModifier = (value: unknown) =>
  typeof value === "function" && Boolean((value as unknown as Record<symbol, unknown>)[unsupportedModifierMarker]);

export const throwConcurrentUnsupported = (): never => {
  throw new Error(CONCURRENT_UNSUPPORTED_MESSAGE);
};

export const throwRandomizeUnsupported = (): never => {
  throw new Error(RANDOMIZE_UNSUPPORTED_MESSAGE);
};

const createUnsupportedModifierApi = (name: string) => {
  const unsupported = (() => {
    throw new Error(`allure-bun can't preserve ${name} semantics because bun:test did not expose ${name}`);
  }) as unknown as BunWrappedFn;

  (unsupported as unknown as Record<symbol, boolean>)[unsupportedModifierMarker] = true;
  unsupported.each = () => {
    throw new Error(`allure-bun can't preserve ${name}.each semantics because bun:test did not expose ${name}`);
  };

  return unsupported;
};

const createUnsupportedModifierFactory = (name: string) => {
  const unsupported = (() => {
    throw new Error(`allure-bun can't preserve ${name} semantics because bun:test did not expose ${name}`);
  }) as unknown as BunWrappedFn;

  (unsupported as unknown as Record<symbol, boolean>)[unsupportedModifierMarker] = true;

  return unsupported;
};

const createConcurrentUnsupportedApi = () => {
  const unsupported = (() => {
    throwConcurrentUnsupported();
  }) as unknown as BunWrappedFn;

  unsupported.each = () => {
    throwConcurrentUnsupported();
  };

  return unsupported;
};

const createEachFactory = (source: BunWrappedFn, rows: readonly unknown[]) => {
  const each = getCallableProp(source, "each");

  if (!each) {
    return undefined;
  }

  return (each as BunOriginalFn).call(source, rows) as BunOriginalFn;
};

const registerManualEachCase = (
  source: BunOriginalFn,
  title: string,
  rest: any[],
  rowArgs: unknown[],
  fnIndex: number,
) => {
  if (fnIndex === -1) {
    return source(title, ...rest);
  }

  const originalFn = rest[fnIndex] as BunOriginalFn;
  const nextRest = rest.slice();

  nextRest[fnIndex] = (...args: any[]) => {
    if (args.length > 0) {
      return originalFn(...args);
    }

    return originalFn(...rowArgs);
  };

  return source(title, ...nextRest);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getRetryFromRest = (fileContext: BunFileContext, rest: any[]) => {
  const options = rest.find((value) => isRecord(value) && typeof value.retry === "number");

  return Math.max(0, Math.trunc((options?.retry as number | undefined) ?? fileContext.defaultRetry));
};

const getEachParameters = (row: ReturnType<typeof normalizeEachRows>[number]): Parameter[] => {
  if (row.objectValues) {
    return Object.entries(row.objectValues).map(([name, value]) => ({
      name,
      value: serialize(value),
    }));
  }

  return row.args.map((value, index) => ({
    name: `arg${index}`,
    value: serialize(value),
  }));
};

const registerSelectedTest = (
  fileContext: BunFileContext,
  name: string,
  config: TestWrapperConfig,
  options: {
    parameters?: Parameter[];
    retry?: number;
  } = {},
) => {
  const parent = getCurrentRegistrationSuite(fileContext);
  const mode = combineModes(getSuiteMode(parent), config.mode);
  const behavior = resolveTestBehavior(mode, config.behavior);
  const test = createTestEntry(name, parent, {
    mode,
    behavior,
    parameters: options.parameters,
    retry: options.retry,
  });

  if (!isTestSelectedByPlan(fileContext.testPlan, fileContext, test)) {
    return undefined;
  }

  markSuiteSelected(parent);
  fileContext.tests.push(test);

  return test;
};

const createLifecycleDeps = (deps: BunWrapperDeps) => ({
  activateFileContext: deps.activateFileContext,
  throwConcurrentUnsupported,
});

const emitStaticSelectedTests = (deps: BunWrapperDeps, fileContext: BunFileContext, tests: BunRegisteredTest[]) => {
  const lifecycleDeps = createLifecycleDeps(deps);

  for (const test of tests) {
    if (!isTestSelectedByBunNamePattern(fileContext, test)) {
      test.completed = true;
      continue;
    }

    emitStaticTest(lifecycleDeps, fileContext, test);
  }
};

const wrapDescribeEach = (
  source: BunWrappedFn,
  rows: readonly unknown[],
  deps: BunWrapperDeps,
  config: DescribeWrapperConfig,
) => {
  const eachFactory = createEachFactory(source, rows);

  return ((name: string, fn?: (...args: any[]) => unknown, ...rest: any[]) => {
    if (typeof fn !== "function") {
      if (eachFactory) {
        return eachFactory(name, fn, ...rest);
      }

      for (const row of normalizeEachRows(rows)) {
        source(formatEachTitle(name, row), fn, ...rest);
      }

      return;
    }

    const filePath = getCallerFilePath(new Error().stack);
    const fileContext = deps.getFileContext(filePath);
    const parent = getCurrentRegistrationSuite(fileContext);
    const normalizedRows = normalizeEachRows(rows);

    if (eachFactory) {
      let registrationIndex = 0;

      return eachFactory(
        name,
        (...args: any[]) => {
          const row = normalizedRows[registrationIndex++]!;
          const suite = createDescribeBlock(formatEachTitle(name, row), parent, config.mode);

          fileContext.registrationStack.push(suite);

          try {
            return fn(...args);
          } finally {
            fileContext.registrationStack.pop();
          }
        },
        ...rest,
      );
    }

    for (const row of normalizedRows) {
      const suite = createDescribeBlock(formatEachTitle(name, row), parent, config.mode);

      source(
        formatEachTitle(name, row),
        () => {
          fileContext.registrationStack.push(suite);

          try {
            return fn(...row.args);
          } finally {
            fileContext.registrationStack.pop();
          }
        },
        ...rest,
      );
    }

    return;
  }) as BunOriginalFn;
};

const wrapTestEach = (
  source: BunWrappedFn,
  rows: readonly unknown[],
  deps: BunWrapperDeps,
  config: TestWrapperConfig,
) => {
  return ((name: string, ...rest: any[]) => {
    const filePath = getCallerFilePath(new Error().stack);
    const fileContext = deps.getFileContext(filePath);
    const normalizedRows = normalizeEachRows(rows);
    const selectedRows = normalizedRows
      .map((row) => {
        const title = formatEachTitle(name, row);
        const test = registerSelectedTest(fileContext, title, config, {
          parameters: getEachParameters(row),
          retry: getRetryFromRest(fileContext, rest),
        });

        if (!test) {
          return undefined;
        }

        return {
          row,
          test,
        };
      })
      .filter(Boolean) as Array<{
      row: (typeof normalizedRows)[number];
      test: NonNullable<ReturnType<typeof registerSelectedTest>>;
    }>;

    if (selectedRows.length === 0) {
      return undefined;
    }

    const fnIndex = rest.findIndex((value) => typeof value === "function");
    const firstTest = selectedRows[0]!.test;
    const isStaticTest = firstTest.mode === "skip" || (firstTest.behavior === "todo" && !fileContext.todoModeEnabled);
    const eachFactory = createEachFactory(
      source,
      selectedRows.map(({ row }) => row.raw),
    );

    if (isStaticTest || fnIndex === -1) {
      const registrationResult = eachFactory
        ? eachFactory(name, ...rest)
        : selectedRows.map(({ row }) => source(formatEachTitle(name, row), ...rest));

      if (isStaticTest) {
        emitStaticSelectedTests(
          deps,
          fileContext,
          selectedRows.map(({ test }) => test),
        );
      }

      return registrationResult;
    }

    const originalFn = rest[fnIndex] as BunOriginalFn;
    if (eachFactory) {
      let runtimeIndex = 0;
      const nextRest = rest.slice();

      nextRest[fnIndex] = (...args: any[]) => {
        const contextTest = selectedRows.find(({ test }) => test === fileContext.currentTest)?.test;
        const current = contextTest ?? selectedRows[runtimeIndex++]?.test;

        if (!current) {
          throw new Error("allure-bun failed to match a parameterized Bun test invocation");
        }

        return executeWrappedTest(createLifecycleDeps(deps), fileContext, current, originalFn, args);
      };

      return eachFactory(name, ...nextRest);
    }

    return selectedRows.map(({ row, test }) =>
      registerManualEachCase(
        source,
        formatEachTitle(name, row),
        [
          ...rest.slice(0, fnIndex),
          (...args: any[]) => executeWrappedTest(createLifecycleDeps(deps), fileContext, test, originalFn, args),
          ...rest.slice(fnIndex + 1),
        ],
        row.args,
        fnIndex,
      ),
    );
  }) as BunOriginalFn;
};

export const wrapDescribeCallable = (
  source: BunWrappedFn,
  deps: BunWrapperDeps,
  config: DescribeWrapperConfig,
  options: WrapOptions,
): BunWrappedFn => {
  const wrapped = ((name: string, fn?: () => unknown, ...rest: any[]) => {
    if (typeof fn !== "function") {
      return source(name, fn, ...rest);
    }

    const filePath = getCallerFilePath(new Error().stack);
    const fileContext = deps.getFileContext(filePath);
    const suite = createDescribeBlock(name, getCurrentRegistrationSuite(fileContext), config.mode);

    return source(
      name,
      () => {
        fileContext.registrationStack.push(suite);

        try {
          return fn();
        } finally {
          fileContext.registrationStack.pop();
        }
      },
      ...rest,
    );
  }) as BunWrappedFn;

  // wrapDescribeEach handles a missing source.each internally; always attach .each.
  wrapped.each = (rows: readonly unknown[]) => wrapDescribeEach(source, rows, deps, config);

  if (!options.allowModifiers) {
    return wrapped;
  }

  const only = getCallableProp(source, "only");
  const skip = getCallableProp(source, "skip");
  const todo = getCallableProp(source, "todo");
  const ifFactory = getCallableProp(source, "if");
  const skipIf = getCallableProp(source, "skipIf");
  const todoIf = getCallableProp(source, "todoIf");

  wrapped.only = only
    ? wrapDescribeCallable(only as BunWrappedFn, deps, config, {
        allowModifiers: false,
      })
    : createUnsupportedModifierApi("describe.only");
  wrapped.skip = skip
    ? wrapDescribeCallable(
        skip as BunWrappedFn,
        deps,
        {
          mode: combineModes(config.mode, "skip"),
        },
        {
          allowModifiers: false,
        },
      )
    : createUnsupportedModifierApi("describe.skip");
  wrapped.todo = todo
    ? wrapDescribeCallable(
        todo as BunWrappedFn,
        deps,
        {
          mode: combineModes(config.mode, "todo"),
        },
        {
          allowModifiers: false,
        },
      )
    : createUnsupportedModifierApi("describe.todo");
  wrapped.if = ifFactory
    ? (condition: boolean) =>
        wrapDescribeCallable(
          (ifFactory as BunOriginalFn).call(source, condition) as BunWrappedFn,
          deps,
          {
            mode: combineModes(config.mode, condition ? undefined : "skip"),
          },
          {
            allowModifiers: false,
          },
        )
    : createUnsupportedModifierFactory("describe.if");
  wrapped.skipIf = skipIf
    ? (condition: boolean) =>
        wrapDescribeCallable(
          (skipIf as BunOriginalFn).call(source, condition) as BunWrappedFn,
          deps,
          {
            mode: combineModes(config.mode, condition ? "skip" : undefined),
          },
          {
            allowModifiers: false,
          },
        )
    : createUnsupportedModifierFactory("describe.skipIf");
  wrapped.todoIf = todoIf
    ? (condition: boolean) =>
        wrapDescribeCallable(
          (todoIf as BunOriginalFn).call(source, condition) as BunWrappedFn,
          deps,
          {
            mode: combineModes(config.mode, condition ? "todo" : undefined),
          },
          {
            allowModifiers: false,
          },
        )
    : createUnsupportedModifierFactory("describe.todoIf");

  return wrapped;
};

export const wrapTestCallable = (
  source: BunWrappedFn,
  deps: BunWrapperDeps,
  config: TestWrapperConfig,
  options: WrapOptions,
): BunWrappedFn => {
  const wrapped = ((name: string, ...rest: any[]) => {
    const filePath = getCallerFilePath(new Error().stack);
    const fileContext = deps.getFileContext(filePath);
    const test = registerSelectedTest(fileContext, name, config, {
      retry: getRetryFromRest(fileContext, rest),
    });

    if (!test) {
      return undefined;
    }

    const fnIndex = rest.findIndex((value) => typeof value === "function");
    const isStaticTest = test.mode === "skip" || (test.behavior === "todo" && !fileContext.todoModeEnabled);

    if (isStaticTest || fnIndex === -1) {
      const registrationResult = source(name, ...rest);

      if (isStaticTest) {
        emitStaticSelectedTests(deps, fileContext, [test]);
      }

      return registrationResult;
    }

    const originalFn = rest[fnIndex] as BunOriginalFn;
    const nextRest = rest.slice();

    nextRest[fnIndex] = (...args: any[]) => {
      return executeWrappedTest(createLifecycleDeps(deps), fileContext, test, originalFn, args);
    };

    return source(name, ...nextRest);
  }) as BunWrappedFn;

  wrapped.each = (rows: readonly unknown[]) => wrapTestEach(source, rows, deps, config);

  if (!options.allowModifiers) {
    return wrapped;
  }

  const only = getCallableProp(source, "only");
  const serial = getCallableProp(source, "serial");
  const skip = getCallableProp(source, "skip");
  const todo = getCallableProp(source, "todo");
  const failing = getCallableProp(source, "failing");
  const ifFactory = getCallableProp(source, "if");
  const skipIf = getCallableProp(source, "skipIf");
  const todoIf = getCallableProp(source, "todoIf");

  wrapped.only = only
    ? wrapTestCallable(only as BunWrappedFn, deps, config, {
        allowModifiers: false,
      })
    : createUnsupportedModifierApi("test.only");
  wrapped.serial = serial
    ? wrapTestCallable(serial as BunWrappedFn, deps, config, {
        allowModifiers: false,
      })
    : createUnsupportedModifierApi("test.serial");
  wrapped.skip = skip
    ? wrapTestCallable(
        skip as BunWrappedFn,
        deps,
        {
          ...config,
          mode: combineModes(config.mode, "skip"),
        },
        {
          allowModifiers: false,
        },
      )
    : createUnsupportedModifierApi("test.skip");
  wrapped.todo = todo
    ? wrapTestCallable(
        todo as BunWrappedFn,
        deps,
        {
          ...config,
          mode: combineModes(config.mode, "todo"),
        },
        {
          allowModifiers: false,
        },
      )
    : createUnsupportedModifierApi("test.todo");
  wrapped.failing = failing
    ? wrapTestCallable(
        failing as BunWrappedFn,
        deps,
        {
          ...config,
          behavior: "failing",
        },
        {
          allowModifiers: false,
        },
      )
    : createUnsupportedModifierApi("test.failing");
  wrapped.if = ifFactory
    ? (condition: boolean) =>
        wrapTestCallable(
          (ifFactory as BunOriginalFn).call(source, condition) as BunWrappedFn,
          deps,
          {
            ...config,
            mode: combineModes(config.mode, condition ? undefined : "skip"),
          },
          {
            allowModifiers: false,
          },
        )
    : createUnsupportedModifierFactory("test.if");
  wrapped.skipIf = skipIf
    ? (condition: boolean) =>
        wrapTestCallable(
          (skipIf as BunOriginalFn).call(source, condition) as BunWrappedFn,
          deps,
          {
            ...config,
            mode: combineModes(config.mode, condition ? "skip" : undefined),
          },
          {
            allowModifiers: false,
          },
        )
    : createUnsupportedModifierFactory("test.skipIf");
  wrapped.todoIf = todoIf
    ? (condition: boolean) =>
        wrapTestCallable(
          (todoIf as BunOriginalFn).call(source, condition) as BunWrappedFn,
          deps,
          {
            ...config,
            mode: combineModes(config.mode, condition ? "todo" : undefined),
          },
          {
            allowModifiers: false,
          },
        )
    : createUnsupportedModifierFactory("test.todoIf");
  wrapped.concurrent = createConcurrentUnsupportedApi();

  return wrapped;
};

export const createWrappedDescribe = (source: BunWrappedFn, deps: BunWrapperDeps) => {
  return wrapDescribeCallable(source, deps, {}, { allowModifiers: true });
};

export const createWrappedTest = (source: BunWrappedFn, deps: BunWrapperDeps) => {
  return wrapTestCallable(source, deps, { behavior: "normal" }, { allowModifiers: true });
};

export const createWrappedHook = (source: BunOriginalFn, deps: BunWrapperDeps, type: BunHookType) => {
  return ((fn?: (...args: any[]) => unknown, ...rest: any[]) => {
    if (typeof fn !== "function") {
      return source(fn, ...rest);
    }

    const filePath = getCallerFilePath(new Error().stack);
    const fileContext = deps.getFileContext(filePath);
    const suite = getCurrentRegistrationSuite(fileContext);

    return source(
      async (...args: any[]) => {
        return executeHook(
          {
            activateFileContext: deps.activateFileContext,
            throwConcurrentUnsupported,
          },
          fileContext,
          suite,
          type,
          fn,
          args,
        );
      },
      ...rest,
    );
  }) as BunOriginalFn;
};

export const createSyntheticBeforeEach = (deps: BunWrapperDeps, fileContext: BunFileContext) => {
  return async () => {
    ensureCurrentTest(
      {
        activateFileContext: deps.activateFileContext,
        throwConcurrentUnsupported,
      },
      fileContext,
    );
  };
};

export const createSyntheticAfterEach = (fileContext: BunFileContext) => {
  return async () => {
    const currentTest = fileContext.currentTest;

    if (!currentTest) {
      return;
    }

    finalizeTest(fileContext, currentTest);
  };
};

export const createSyntheticAfterAll = (deps: BunWrapperDeps, fileContext: BunFileContext) => {
  return () => {
    finishFileContext(
      {
        activateFileContext: deps.activateFileContext,
        throwConcurrentUnsupported,
      },
      fileContext,
    );
  };
};
