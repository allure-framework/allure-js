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

  if (!eachFactory) {
    return undefined;
  }

  return ((name: string, fn?: (...args: any[]) => unknown, ...rest: any[]) => {
    if (typeof fn !== "function") {
      return eachFactory(name, fn, ...rest);
    }

    const filePath = getCallerFilePath(new Error().stack);
    const fileContext = deps.getFileContext(filePath);
    const parent = getCurrentRegistrationSuite(fileContext);
    const normalizedRows = normalizeEachRows(rows);
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

    const eachFactory = createEachFactory(
      source,
      selectedRows.map(({ row }) => row.raw),
    );

    if (!eachFactory) {
      return undefined;
    }

    const fnIndex = rest.findIndex((value) => typeof value === "function");
    const firstTest = selectedRows[0]!.test;
    const isStaticTest = firstTest.mode === "skip" || (firstTest.behavior === "todo" && !fileContext.todoModeEnabled);

    if (isStaticTest || fnIndex === -1) {
      const registrationResult = eachFactory(name, ...rest);

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
    let runtimeIndex = 0;
    const nextRest = rest.slice();

    nextRest[fnIndex] = (...args: any[]) => {
      const current = selectedRows[runtimeIndex++]?.test;

      if (!current) {
        throw new Error("allure-jest/bun failed to match a parameterized Bun test invocation");
      }

      return executeWrappedTest(createLifecycleDeps(deps), fileContext, current, originalFn, args);
    };

    return eachFactory(name, ...nextRest);
  }) as BunOriginalFn;
};

const wrapDescribeCallable = (
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

  if (getCallableProp(source, "each")) {
    wrapped.each = (rows: readonly unknown[]) => wrapDescribeEach(source, rows, deps, config);
  }

  if (!options.allowModifiers) {
    return wrapped;
  }

  const only = getCallableProp(source, "only");
  if (only) {
    wrapped.only = wrapDescribeCallable(only as BunWrappedFn, deps, config, {
      allowModifiers: false,
    });
  }

  const skip = getCallableProp(source, "skip");
  if (skip) {
    wrapped.skip = wrapDescribeCallable(
      skip as BunWrappedFn,
      deps,
      {
        mode: combineModes(config.mode, "skip"),
      },
      {
        allowModifiers: false,
      },
    );
  }

  const todo = getCallableProp(source, "todo");
  if (todo) {
    wrapped.todo = wrapDescribeCallable(
      todo as BunWrappedFn,
      deps,
      {
        mode: combineModes(config.mode, "todo"),
      },
      {
        allowModifiers: false,
      },
    );
  }

  const ifFactory = getCallableProp(source, "if");
  if (ifFactory) {
    wrapped.if = (condition: boolean) =>
      wrapDescribeCallable(
        (ifFactory as BunOriginalFn).call(source, condition) as BunWrappedFn,
        deps,
        {
          mode: combineModes(config.mode, condition ? undefined : "skip"),
        },
        {
          allowModifiers: false,
        },
      );
  }

  const skipIf = getCallableProp(source, "skipIf");
  if (skipIf) {
    wrapped.skipIf = (condition: boolean) =>
      wrapDescribeCallable(
        (skipIf as BunOriginalFn).call(source, condition) as BunWrappedFn,
        deps,
        {
          mode: combineModes(config.mode, condition ? "skip" : undefined),
        },
        {
          allowModifiers: false,
        },
      );
  }

  const todoIf = getCallableProp(source, "todoIf");
  if (todoIf) {
    wrapped.todoIf = (condition: boolean) =>
      wrapDescribeCallable(
        (todoIf as BunOriginalFn).call(source, condition) as BunWrappedFn,
        deps,
        {
          mode: combineModes(config.mode, condition ? "todo" : undefined),
        },
        {
          allowModifiers: false,
        },
      );
  }

  return wrapped;
};

const wrapTestCallable = (
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

  const only = getCallableProp(source, "only");
  if (only) {
    wrapped.only = wrapTestCallable(only as BunWrappedFn, deps, config, {
      allowModifiers: false,
    });
  }

  const serial = getCallableProp(source, "serial");
  if (serial) {
    wrapped.serial = wrapTestCallable(serial as BunWrappedFn, deps, config, {
      allowModifiers: false,
    });
  }

  const skip = getCallableProp(source, "skip");
  if (skip) {
    wrapped.skip = wrapTestCallable(
      skip as BunWrappedFn,
      deps,
      {
        ...config,
        mode: combineModes(config.mode, "skip"),
      },
      {
        allowModifiers: false,
      },
    );
  }

  const todo = getCallableProp(source, "todo");
  if (todo) {
    wrapped.todo = wrapTestCallable(
      todo as BunWrappedFn,
      deps,
      {
        ...config,
        mode: combineModes(config.mode, "todo"),
      },
      {
        allowModifiers: false,
      },
    );
  }

  const failing = getCallableProp(source, "failing");
  if (failing) {
    wrapped.failing = wrapTestCallable(
      failing as BunWrappedFn,
      deps,
      {
        ...config,
        behavior: "failing",
      },
      {
        allowModifiers: false,
      },
    );
  }

  const ifFactory = getCallableProp(source, "if");
  if (ifFactory) {
    wrapped.if = (condition: boolean) =>
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
      );
  }

  const skipIf = getCallableProp(source, "skipIf");
  if (skipIf) {
    wrapped.skipIf = (condition: boolean) =>
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
      );
  }

  const todoIf = getCallableProp(source, "todoIf");
  if (todoIf) {
    wrapped.todoIf = (condition: boolean) =>
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
      );
  }

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
