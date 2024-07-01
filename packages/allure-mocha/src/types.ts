import type { Label } from "allure-js-commons";

export type TestPlanIndices = {
  fullNameIndex: ReadonlySet<string>;
  idIndex: ReadonlySet<string>;
};

export type AllureMochaTestData = {
  isIncludedInTestRun: boolean;
  fullName: string;
  labels: readonly Label[];
  displayName: string;
  scope?: string;
};

export type HookCategory = "before" | "after";

export type HookScope = "all" | "each";

export type HookType = [category?: HookCategory, scope?: HookScope];
