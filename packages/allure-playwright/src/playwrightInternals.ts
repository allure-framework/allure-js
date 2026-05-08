import { createRequire } from "node:module";

import type { TestInfo } from "@playwright/test";

export type PlaywrightInternalAttachment = {
  name: string;
  contentType: string;
  body?: Buffer;
  path?: string;
};

export type PlaywrightInternalAnnotation = {
  type: string;
  description?: string;
};

export type PlaywrightInternalStep = {
  stepId: string;
  info: {
    annotations: PlaywrightInternalAnnotation[];
  };
  complete: (result: { error?: unknown }) => void;
};

export type PlaywrightInternalTestInfo = TestInfo & {
  _addStep: (
    data: {
      category: string;
      title: string;
    },
    parentStep?: PlaywrightInternalStep,
  ) => PlaywrightInternalStep;
  _attach: (attachment: PlaywrightInternalAttachment, stepId?: string) => void;
};

export type PlaywrightInternals = {
  currentZone: () => {
    with: (
      name: string,
      value: unknown,
    ) => {
      run: <T>(cb: () => T) => T;
    };
  };
};

let playwrightInternals: PlaywrightInternals | undefined;

const localRequire = typeof require === "function" ? require : createRequire(`${process.cwd()}/package.json`);

export const getPlaywrightInternals = (): PlaywrightInternals => {
  if (!playwrightInternals) {
    const playwrightTestRequire = createRequire(localRequire.resolve("@playwright/test/package.json"));
    const playwrightPackagePath = playwrightTestRequire.resolve("playwright");
    const playwrightInternalRequire = createRequire(playwrightPackagePath);

    playwrightInternals = {
      currentZone: playwrightInternalRequire("playwright-core/lib/utils")
        .currentZone as PlaywrightInternals["currentZone"],
    };
  }

  return playwrightInternals;
};
