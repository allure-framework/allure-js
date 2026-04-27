import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative } from "node:path";

import type { TestPlanV1 } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import {
  ReporterRuntime,
  createDefaultWriter,
  getPosixPath,
  includedInTestPlan,
  parseTestPlan,
} from "allure-js-commons/sdk/reporter";

import type {
  BunDescribeBlock,
  BunFileContext,
  BunRegisteredTest,
  BunRunState,
  BunStaticMode,
  BunTestBehavior,
} from "./types.js";
import { getTestId } from "./utils.js";

let bunTodoModeEnabled: boolean | undefined;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasCliFlag = (value: string[] | string, flag: string) => {
  if (Array.isArray(value)) {
    return value.includes(flag);
  }

  return new RegExp(`(^|\\s)${escapeRegex(flag)}(?=\\s|$)`).test(value);
};

const detectBunTodoMode = () => {
  if (process.env.ALLURE_BUN_TODO_MODE === "1") {
    bunTodoModeEnabled = true;
    return bunTodoModeEnabled;
  }

  if (process.env.ALLURE_BUN_TODO_MODE === "0") {
    bunTodoModeEnabled = false;
    return bunTodoModeEnabled;
  }

  if (bunTodoModeEnabled !== undefined) {
    return bunTodoModeEnabled;
  }

  const knownArgs = [...process.execArgv, ...process.argv, ...(((globalThis as any).Bun?.argv as string[]) ?? [])];

  if (hasCliFlag(knownArgs, "--todo")) {
    bunTodoModeEnabled = true;
    return bunTodoModeEnabled;
  }

  try {
    const procArgs = readFileSync("/proc/self/cmdline", "utf8").split("\u0000").join(" ");

    if (hasCliFlag(procArgs, "--todo")) {
      bunTodoModeEnabled = true;
      return bunTodoModeEnabled;
    }
  } catch {
    // Linux-only procfs is not always available.
  }

  try {
    const command = execFileSync("ps", ["-o", "command=", "-p", String(process.pid)], {
      encoding: "utf8",
    }).trim();

    bunTodoModeEnabled = hasCliFlag(command, "--todo");
    return bunTodoModeEnabled;
  } catch {
    bunTodoModeEnabled = false;
    return bunTodoModeEnabled;
  }
};

export const getCallerFilePath = (stack: string | undefined) => {
  if (!stack) {
    return process.cwd();
  }

  const lines = stack.split("\n").slice(1);

  for (const line of lines) {
    const trimmed = line.trim();
    const match =
      trimmed.match(/\(((?:file:\/\/)?(?:\/|[A-Za-z]:\\).+:\d+(?::\d+)?)\)$/) ??
      trimmed.match(/at ((?:file:\/\/)?(?:\/|[A-Za-z]:\\).+:\d+(?::\d+)?)$/);

    if (!match) {
      continue;
    }

    const stackLocation = match[1].replace(/:\d+(?::\d+)?$/, "");
    const filePath = stackLocation.startsWith("file://") ? new URL(stackLocation).pathname : stackLocation;
    const normalizedPath = filePath.replace(/\\/g, "/");

    if (
      !normalizedPath.includes("/packages/allure-bun/src/") &&
      !normalizedPath.includes("/packages/allure-bun/dist/") &&
      !normalizedPath.includes("/node_modules/allure-bun/")
    ) {
      return filePath;
    }
  }

  return process.cwd();
};

export const createRunState = (): BunRunState => ({
  environmentInfoWritten: false,
  categoriesWritten: false,
});

export const createFileContext = (filePath: string, runState: BunRunState): BunFileContext => {
  const rootDescribeBlock: BunDescribeBlock = {
    name: "ROOT_DESCRIBE_BLOCK",
    hasSelectedTests: false,
  };
  const testPath = relative(process.cwd(), filePath);
  const runtime = new ReporterRuntime({
    writer: createDefaultWriter({ resultsDir: process.env.ALLURE_RESULTS_DIR }),
  });

  return {
    runtime,
    runState,
    testPath,
    testPlan: parseTestPlan(),
    todoModeEnabled: detectBunTodoMode(),
    rootDescribeBlock,
    scopes: [],
    executables: [],
    registrationStack: [rootDescribeBlock],
    activeSuites: [],
    tests: [],
    nextPendingTestIndex: 0,
    afterEachHookRegistered: false,
    rootScopeActive: false,
    runFinished: false,
  };
};

export const getCurrentRegistrationSuite = (fileContext: BunFileContext) => {
  return fileContext.registrationStack[fileContext.registrationStack.length - 1]!;
};

export const createDescribeBlock = (
  name: string,
  parent: BunDescribeBlock,
  mode?: BunStaticMode,
): BunDescribeBlock => ({
  name,
  parent,
  mode,
  hasSelectedTests: false,
});

export const createTestEntry = (
  name: string,
  parent: BunDescribeBlock,
  options: {
    mode?: BunStaticMode;
    behavior: BunTestBehavior;
  },
): BunRegisteredTest => ({
  name,
  parent,
  errors: [],
  startedAt: 0,
  mode: options.mode,
  behavior: options.behavior,
  started: false,
  completed: false,
  resultEmitted: false,
});

export const combineModes = (left?: BunStaticMode, right?: BunStaticMode): BunStaticMode | undefined => {
  if (left === "skip" || right === "skip") {
    return "skip";
  }

  if (left === "todo" || right === "todo") {
    return "todo";
  }

  return undefined;
};

export const resolveTestBehavior = (mode: BunStaticMode | undefined, behavior: BunTestBehavior): BunTestBehavior => {
  if (mode === "todo") {
    return "todo";
  }

  if (mode === "skip") {
    return "normal";
  }

  return behavior;
};

export const getSuitePath = (suite: BunDescribeBlock): BunDescribeBlock[] => {
  const path: BunDescribeBlock[] = [];
  let current: BunDescribeBlock | undefined = suite;

  while (current?.parent) {
    path.unshift(current);
    current = current.parent;
  }

  return path;
};

export const getSuiteNames = (suite: BunDescribeBlock): string[] => getSuitePath(suite).map((entry) => entry.name);

export const getSuiteMode = (suite: BunDescribeBlock): BunStaticMode | undefined => {
  let current: BunDescribeBlock | undefined = suite;
  let hasTodo = false;

  while (current) {
    if (current.mode === "skip") {
      return "skip";
    }

    if (current.mode === "todo") {
      hasTodo = true;
    }

    current = current.parent;
  }

  return hasTodo ? "todo" : undefined;
};

export const isSuiteDescendantOf = (suite: BunDescribeBlock, ancestor: BunDescribeBlock) => {
  let current: BunDescribeBlock | undefined = suite;

  while (current) {
    if (current === ancestor) {
      return true;
    }

    current = current.parent;
  }

  return false;
};

export const markSuiteSelected = (suite: BunDescribeBlock) => {
  let current: BunDescribeBlock | undefined = suite;

  while (current) {
    current.hasSelectedTests = true;
    current = current.parent;
  }
};

export const getFullName = (testPath: string, suitePath: string[], testName: string) => {
  const { cleanTitle } = extractMetadataFromString(testName);

  return `${getPosixPath(testPath)}#${getTestId(suitePath.concat(cleanTitle))}`;
};

export const getRegisteredTestFullName = (
  fileContext: BunFileContext,
  test: Pick<BunRegisteredTest, "name" | "parent">,
) => {
  return getFullName(fileContext.testPath, getSuiteNames(test.parent), test.name);
};

export const isTestSelectedByPlan = (
  testPlan: TestPlanV1 | undefined,
  fileContext: BunFileContext,
  test: Pick<BunRegisteredTest, "name" | "parent">,
) => {
  if (!testPlan) {
    return true;
  }

  const fullName = getRegisteredTestFullName(fileContext, test);

  return includedInTestPlan(testPlan, { fullName, tags: [test.name] });
};
