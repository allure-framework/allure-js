import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative } from "node:path";

import type { TestPlanV1 } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import {
  type ReporterConfig,
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
let bunConcurrentModeEnabled: boolean | undefined;
let bunRandomizeModeEnabled: boolean | undefined;
let bunRetryValue: number | undefined;
let bunTestNamePattern: RegExp | undefined | null;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isSafeRegexPattern = (value: string) => {
  // Keep this conservative: reject overly large or commonly catastrophic constructs.
  if (value.length > 256) {
    return false;
  }

  // Reject nested quantifiers like `(a+)+`, `(.*)+`, etc.
  if (/\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)[+*{]/.test(value)) {
    return false;
  }

  // Reject quantified groups with alternation, a common backtracking hotspot.
  if (/\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)[+*{]/.test(value)) {
    return false;
  }

  return true;
};

const hasCliFlag = (value: string[] | string, flag: string) => {
  if (Array.isArray(value)) {
    return value.includes(flag);
  }

  return new RegExp(`(^|\\s)${escapeRegex(flag)}(?=\\s|$)`).test(value);
};

const getPsCommand = () => {
  try {
    return execFileSync("ps", ["-o", "command=", "-p", String(process.pid)], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
};

const tokenizeCliCommand = (command: string) => {
  const tokens: string[] = [];
  const tokenPattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(command))) {
    tokens.push((match[1] ?? match[2] ?? match[3] ?? "").replace(/\\(["'])/g, "$1"));
  }

  return tokens;
};

const getKnownCliArgs = () => [
  ...process.execArgv,
  ...process.argv,
  ...(((globalThis as any).Bun?.argv as string[]) ?? []),
  ...tokenizeCliCommand(getPsCommand()),
];

const detectBunCliFlag = (flag: string) => {
  const knownArgs = getKnownCliArgs();

  if (hasCliFlag(knownArgs, flag)) {
    return true;
  }

  try {
    const procArgs = readFileSync("/proc/self/cmdline", "utf8").split("\u0000").join(" ");

    if (hasCliFlag(procArgs, flag)) {
      return true;
    }
  } catch {
    // Linux-only procfs is not always available.
  }

  return false;
};

const getBunCliOptionValue = (...flags: string[]) => {
  const knownArgs = getKnownCliArgs();

  for (let i = 0; i < knownArgs.length; i += 1) {
    const arg = knownArgs[i]!;

    for (const flag of flags) {
      if (arg === flag) {
        return knownArgs[i + 1];
      }

      if (arg.startsWith(`${flag}=`)) {
        return arg.slice(flag.length + 1);
      }
    }
  }

  return undefined;
};

const parseIntegerOption = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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

  if (bunTodoModeEnabled === undefined) {
    bunTodoModeEnabled = detectBunCliFlag("--todo");
  }

  return bunTodoModeEnabled;
};

export const detectBunConcurrentMode = () => {
  if (process.env.ALLURE_BUN_CONCURRENT_MODE === "1") {
    bunConcurrentModeEnabled = true;

    return bunConcurrentModeEnabled;
  }

  if (process.env.ALLURE_BUN_CONCURRENT_MODE === "0") {
    bunConcurrentModeEnabled = false;

    return bunConcurrentModeEnabled;
  }

  if (bunConcurrentModeEnabled === undefined) {
    bunConcurrentModeEnabled = detectBunCliFlag("--concurrent");
  }

  return bunConcurrentModeEnabled;
};

export const detectBunRandomizeMode = () => {
  if (process.env.ALLURE_BUN_RANDOMIZE_MODE === "1") {
    bunRandomizeModeEnabled = true;

    return bunRandomizeModeEnabled;
  }

  if (process.env.ALLURE_BUN_RANDOMIZE_MODE === "0") {
    bunRandomizeModeEnabled = false;

    return bunRandomizeModeEnabled;
  }

  if (bunRandomizeModeEnabled === undefined) {
    bunRandomizeModeEnabled = detectBunCliFlag("--randomize");
  }

  return bunRandomizeModeEnabled;
};

const getBunRetryValue = () => {
  if (process.env.ALLURE_BUN_RETRY) {
    bunRetryValue = parseIntegerOption(process.env.ALLURE_BUN_RETRY);

    return bunRetryValue;
  }

  if (bunRetryValue === undefined) {
    bunRetryValue = parseIntegerOption(getBunCliOptionValue("--retry"));
  }

  return bunRetryValue;
};

const getBunTestNamePattern = () => {
  const pattern = process.env.ALLURE_BUN_TEST_NAME_PATTERN ?? getBunCliOptionValue("--test-name-pattern", "-t");

  if (bunTestNamePattern !== undefined) {
    return bunTestNamePattern ?? undefined;
  }

  if (!pattern) {
    bunTestNamePattern = null;

    return undefined;
  }

  try {
    if (!isSafeRegexPattern(pattern)) {
      // eslint-disable-next-line no-console
      console.error("could not parse Bun test name pattern", new Error("unsafe regex pattern"));
      bunTestNamePattern = null;
      return undefined;
    }

    bunTestNamePattern = new RegExp(pattern);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("could not parse Bun test name pattern", error);
    bunTestNamePattern = null;
  }

  return bunTestNamePattern ?? undefined;
};

export const getBunReporterConfig = (): ReporterConfig => {
  const globalConfig = (globalThis as any).allureBunConfig;

  if (globalConfig && typeof globalConfig === "object") {
    return globalConfig as ReporterConfig;
  }

  if (process.env.ALLURE_BUN_CONFIG) {
    try {
      return JSON.parse(process.env.ALLURE_BUN_CONFIG) as ReporterConfig;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("could not parse ALLURE_BUN_CONFIG", error);
    }
  }

  return {};
};

const createReporterRuntime = (allureConfig: ReporterConfig) => {
  const { resultsDir, ...runtimeConfig } = allureConfig;

  return new ReporterRuntime({
    ...runtimeConfig,
    writer: createDefaultWriter({ resultsDir: resultsDir ?? process.env.ALLURE_RESULTS_DIR }),
  });
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

export const createRunState = (allureConfig: ReporterConfig = getBunReporterConfig()): BunRunState => ({
  allureRuntime: createReporterRuntime(allureConfig),
  allureConfig,
  allureEnvironmentInfoWritten: false,
  allureCategoriesWritten: false,
});

export const createFileContext = (filePath: string, runState: BunRunState): BunFileContext => {
  const rootDescribeBlock: BunDescribeBlock = {
    name: "ROOT_DESCRIBE_BLOCK",
    hasSelectedTests: false,
  };
  const testPath = relative(process.cwd(), filePath);
  const allureRuntime = createReporterRuntime(runState.allureConfig);

  return {
    allureRuntime,
    runState,
    testPath,
    testPlan: parseTestPlan(),
    defaultRetry: getBunRetryValue(),
    testNamePattern: getBunTestNamePattern(),
    todoModeEnabled: detectBunTodoMode(),
    rootDescribeBlock,
    scopes: [],
    executables: [],
    registrationStack: [rootDescribeBlock],
    activeSuites: [],
    tests: [],
    nextPendingTestIndex: 0,
    nextRetryTest: undefined,
    afterEachHookRegistered: false,
    afterAllHookRegistered: false,
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
    parameters?: BunRegisteredTest["parameters"];
    retry?: number;
  },
): BunRegisteredTest => ({
  name,
  parent,
  parameters: options.parameters ?? [],
  retry: options.retry ?? 0,
  attempt: 0,
  startedAttempts: 0,
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

export const isTestSelectedByBunNamePattern = (
  fileContext: BunFileContext,
  test: Pick<BunRegisteredTest, "name" | "parent">,
) => {
  if (!fileContext.testNamePattern) {
    return true;
  }

  fileContext.testNamePattern.lastIndex = 0;

  if (fileContext.testNamePattern.test(test.name)) {
    return true;
  }

  fileContext.testNamePattern.lastIndex = 0;

  return fileContext.testNamePattern.test(getRegisteredTestFullName(fileContext, test));
};
