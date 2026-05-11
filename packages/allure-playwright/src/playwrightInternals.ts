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
