import { Category, EnvironmentInfo, TestResult } from "../model.js";
import { LifecycleListener } from "./LifecycleListener.js";
import { Writer } from "./Writer.js";
import { AllureContextProvider } from "./context/index.js";

export interface LinkConfig {
  type: string;
  urlTemplate: string;
  nameTemplate?: string;
}

export type WriterDescriptor = [cls: string, ...args: readonly unknown[]] | string;

export interface Config {
  readonly resultsDir?: string;
  readonly writer: Writer | WriterDescriptor;
  // TODO: handle lifecycle hooks here
  readonly testMapper?: (test: TestResult) => TestResult | null;
  readonly links?: LinkConfig[];
  readonly listeners?: LifecycleListener[];
  readonly environmentInfo?: EnvironmentInfo;
  readonly categories?: Category[];
  readonly contextProvider?: AllureContextProvider;
}
