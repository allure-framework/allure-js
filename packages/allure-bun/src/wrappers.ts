import { CONCURRENT_UNSUPPORTED_MESSAGE } from "./constants.js";
import { emitStaticTest, ensureCurrentTest, executeHook, executeWrappedTest, finalizeTest } from "./lifecycle.js";
import {
  combineModes,
  createDescribeBlock,
  createTestEntry,
  getCallerFilePath,
  getCurrentRegistrationSuite,
  getSuiteMode,
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

const getCallableProp = (source: Record<string, unknown>, key: string) => {
  try {
    const value = source[key];
    return typeof value === "function" ? value : undefined;
  } catch {
    return undefined;
  }
};

export const throwConcurrentUnsupported = (): never => {
  throw new Error(CONCURRENT_UNSUPPORTED_MESSAGE);
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

const registerSelectedTest = (fileContext: BunFileContext, name: string, config: TestWrapperConfig) => {
  const parent = getCurrentRegistrationSuite(fileContext);
  const mode = combineModes(getSuiteMode(parent), config.mode);
  const behavior = resolveTestBehavior(mode, config.behavior);
  const test = createTestEntry(name, parent, {
    mode,
    behavior,
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
        const test = registerSelectedTest(fileContext, title, config);

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
        const current = selectedRows[runtimeIndex++]?.test;

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

  // Same fallback strategy as wrapTestCallable: always assign every modifier so that
  // e.g. describe.only.each(…) never throws even when Bun hasn't attached .only yet.
  const only = getCallableProp(source, "only");
  wrapped.only = wrapDescribeCallable((only ?? source) as BunWrappedFn, deps, config, {
    allowModifiers: false,
  });

  const skip = getCallableProp(source, "skip");
  wrapped.skip = wrapDescribeCallable(
    (skip ?? source) as BunWrappedFn,
    deps,
    {
      mode: combineModes(config.mode, "skip"),
    },
    {
      allowModifiers: false,
    },
  );

  const todo = getCallableProp(source, "todo");
  wrapped.todo = wrapDescribeCallable(
    (todo ?? source) as BunWrappedFn,
    deps,
    {
      mode: combineModes(config.mode, "todo"),
    },
    {
      allowModifiers: false,
    },
  );

  const ifFactory = getCallableProp(source, "if");
  wrapped.if = (condition: boolean) =>
    wrapDescribeCallable(
      (ifFactory ? (ifFactory as BunOriginalFn).call(source, condition) : source) as BunWrappedFn,
      deps,
      {
        mode: combineModes(config.mode, condition ? undefined : "skip"),
      },
      {
        allowModifiers: false,
      },
    );

  const skipIf = getCallableProp(source, "skipIf");
  wrapped.skipIf = (condition: boolean) =>
    wrapDescribeCallable(
      (skipIf ? (skipIf as BunOriginalFn).call(source, condition) : source) as BunWrappedFn,
      deps,
      {
        mode: combineModes(config.mode, condition ? "skip" : undefined),
      },
      {
        allowModifiers: false,
      },
    );

  const todoIf = getCallableProp(source, "todoIf");
  wrapped.todoIf = (condition: boolean) =>
    wrapDescribeCallable(
      (todoIf ? (todoIf as BunOriginalFn).call(source, condition) : source) as BunWrappedFn,
      deps,
      {
        mode: combineModes(config.mode, condition ? "todo" : undefined),
      },
      {
        allowModifiers: false,
      },
    );

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
    const test = registerSelectedTest(fileContext, name, config);

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

  // Each modifier is always assigned. When Bun does not expose the modifier on the
  // source function (e.g. test.only is not yet attached at preload time), we fall back
  // to `source` itself so the wrapper is always callable and test.only.each(…) never
  // throws "undefined is not an object". Tests registered via a fallback modifier run
  // as ordinary tests from Bun's perspective (no Bun-level filtering), but Allure still
  // tracks them with the correct mode/behavior.
  const only = getCallableProp(source, "only");
  wrapped.only = wrapTestCallable((only ?? source) as BunWrappedFn, deps, config, {
    allowModifiers: false,
  });

  const serial = getCallableProp(source, "serial");
  wrapped.serial = wrapTestCallable((serial ?? source) as BunWrappedFn, deps, config, {
    allowModifiers: false,
  });

  const skip = getCallableProp(source, "skip");
  wrapped.skip = wrapTestCallable(
    (skip ?? source) as BunWrappedFn,
    deps,
    {
      ...config,
      mode: combineModes(config.mode, "skip"),
    },
    {
      allowModifiers: false,
    },
  );

  const todo = getCallableProp(source, "todo");
  wrapped.todo = wrapTestCallable(
    (todo ?? source) as BunWrappedFn,
    deps,
    {
      ...config,
      mode: combineModes(config.mode, "todo"),
    },
    {
      allowModifiers: false,
    },
  );

  const failing = getCallableProp(source, "failing");
  wrapped.failing = wrapTestCallable(
    (failing ?? source) as BunWrappedFn,
    deps,
    {
      ...config,
      behavior: "failing",
    },
    {
      allowModifiers: false,
    },
  );

  const ifFactory = getCallableProp(source, "if");
  wrapped.if = (condition: boolean) =>
    wrapTestCallable(
      (ifFactory ? (ifFactory as BunOriginalFn).call(source, condition) : source) as BunWrappedFn,
      deps,
      {
        ...config,
        mode: combineModes(config.mode, condition ? undefined : "skip"),
      },
      {
        allowModifiers: false,
      },
    );

  const skipIf = getCallableProp(source, "skipIf");
  wrapped.skipIf = (condition: boolean) =>
    wrapTestCallable(
      (skipIf ? (skipIf as BunOriginalFn).call(source, condition) : source) as BunWrappedFn,
      deps,
      {
        ...config,
        mode: combineModes(config.mode, condition ? "skip" : undefined),
      },
      {
        allowModifiers: false,
      },
    );

  const todoIf = getCallableProp(source, "todoIf");
  wrapped.todoIf = (condition: boolean) =>
    wrapTestCallable(
      (todoIf ? (todoIf as BunOriginalFn).call(source, condition) : source) as BunWrappedFn,
      deps,
      {
        ...config,
        mode: combineModes(config.mode, condition ? "todo" : undefined),
      },
      {
        allowModifiers: false,
      },
    );

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
