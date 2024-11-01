import type { ReporterConstructor } from "mocha";
import type { Label } from "allure-js-commons";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

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

export type AllureMochaReporterConfig = ReporterConfig & {
  extraReporters?: ReporterEntry | ReporterEntry[];
};

export type ReporterModuleOrCtor = ReporterConstructor | string;

export type ReporterOptions = Record<string, any>;

export type ReporterEntry = ReporterModuleOrCtor | [ReporterModuleOrCtor] | [ReporterModuleOrCtor, ReporterOptions];

export type ReporterDoneFn = (failures: number, fn?: ((failures: number) => void) | undefined) => void;
