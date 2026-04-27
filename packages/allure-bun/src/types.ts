import type { TestPlanV1 } from "allure-js-commons/sdk";
import type { ReporterRuntime } from "allure-js-commons/sdk/reporter";

export type BunWrappedFn = ((...args: any[]) => unknown) & Record<string, unknown>;
export type BunOriginalFn = (...args: any[]) => unknown;
export type BunHookType = "beforeAll" | "afterAll" | "beforeEach" | "afterEach";
export type BunStaticMode = "skip" | "todo";
export type BunTestBehavior = "normal" | "todo" | "failing";

export type BunDescribeBlock = {
  name: string;
  parent?: BunDescribeBlock;
  mode?: BunStaticMode;
  hasSelectedTests: boolean;
};

export type BunRegisteredTest = {
  name: string;
  parent: BunDescribeBlock;
  errors: unknown[];
  startedAt: number;
  duration?: number;
  mode?: BunStaticMode;
  behavior: BunTestBehavior;
  started: boolean;
  completed: boolean;
  resultEmitted: boolean;
};

export type BunRunState = {
  environmentInfoWritten: boolean;
  categoriesWritten: boolean;
};

export type BunFileContext = {
  runtime: ReporterRuntime;
  runState: BunRunState;
  testPath: string;
  testPlan?: TestPlanV1;
  todoModeEnabled: boolean;
  rootDescribeBlock: BunDescribeBlock;
  scopes: string[];
  executables: string[];
  registrationStack: BunDescribeBlock[];
  activeSuites: BunDescribeBlock[];
  tests: BunRegisteredTest[];
  nextPendingTestIndex: number;
  currentTest?: BunRegisteredTest;
  afterEachHookRegistered: boolean;
  rootScopeActive: boolean;
  runFinished: boolean;
};

export type BunOriginals = {
  beforeAll: BunOriginalFn;
  afterAll: BunOriginalFn;
  beforeEach: BunOriginalFn;
  afterEach: BunOriginalFn;
  describe: BunWrappedFn;
  it: BunWrappedFn;
  test: BunWrappedFn;
};
