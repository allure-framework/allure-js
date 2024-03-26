import { TestResult } from "../model.js";
import { LifecycleListener } from "./LifecycleListener.js";
import { Writer } from "./Writer.js";

export interface Config {
  readonly writer: Writer;
  // TODO: handle lifecycle hooks here
  readonly testMapper?: (test: TestResult) => TestResult | null;
  readonly links?: {
    type: string;
    urlTemplate: string;
  }[];
  readonly listeners?: LifecycleListener[];
}
