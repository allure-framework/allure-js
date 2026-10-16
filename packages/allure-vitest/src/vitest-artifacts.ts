import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { RunnerTask as Task } from "vitest";

export type TaskResultLike = NonNullable<Task["result"]>;

export type VitestArtifactAttachment = {
  name?: string;
  path?: string;
  body?: string | Uint8Array;
  contentType?: string;
};

export type VitestArtifact = {
  type?: string;
  message?: string;
  attachments?: VitestArtifactAttachment[];
};

export type AllureVitestAttempt = {
  result?: TaskResultLike;
  runtimeMessages?: RuntimeMessage[];
  artifactStart?: number;
  artifactEnd?: number;
};

export type AllureVitestCurrentAttempt = {
  startTime: number;
  retryCount: number;
  repeatCount: number;
  errorOffset: number;
  artifactStart: number;
  duration?: number;
};
