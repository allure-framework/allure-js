import { Category, EnvironmentInfo, TestResult } from "../model.js";
import { LifecycleListener } from "./LifecycleListener.js";
import { Writer } from "./Writer.js";

export interface LinkConfig {
  type: string;
  urlTemplate: string;
}

export interface Config {
  readonly resultsDir?: string;
  readonly writer: Writer;
  // TODO: handle lifecycle hooks here
  readonly testMapper?: (test: TestResult) => TestResult | null;
  readonly links?: LinkConfig[];
  readonly listeners?: LifecycleListener[];
  readonly environmentInfo?: EnvironmentInfo;
  readonly categories?: Category[];
}
