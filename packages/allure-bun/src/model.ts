import type { RuntimeMessage } from "allure-js-commons/sdk";

export interface AllureTestMetadata {
  allureRuntimeMessages?: RuntimeMessage[];
  allureSkip?: boolean;
}

export type BunTestState = "pass" | "fail" | "skip" | "todo";

export interface BunTestTask {
  name: string;
  file: string;
  state: BunTestState;
  error?: Error;
  duration?: number;
  meta?: AllureTestMetadata;
}
