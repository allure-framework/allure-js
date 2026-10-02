import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { RunnerTask as Task } from "vitest";

export type TaskResultLike = NonNullable<Task["result"]>;

export type VitestArtifactAttachment = {
  name?: string;
  path?: string;
  body?: string | Uint8Array;
  contentType?: string;
};

export type VitestArtifactAnnotation = {
  type?: string;
  message?: string;
  attachment?: VitestArtifactAttachment;
};

export type VitestArtifact = {
  type?: string;
  message?: string;
  annotation?: VitestArtifactAnnotation;
  attachments?: VitestArtifactAttachment[];
};

export type AllureVitestAttempt = {
  result?: TaskResultLike;
  runtimeMessages?: RuntimeMessage[];
  artifacts?: VitestArtifact[];
};

export const toLightweightArtifacts = (artifacts: VitestArtifact[] = []): VitestArtifact[] =>
  artifacts.map(({ attachments, annotation, ...artifact }) => ({
    ...artifact,
    ...(annotation
      ? {
          annotation: {
            ...annotation,
            ...(annotation.attachment
              ? {
                  attachment: toLightweightAttachment(annotation.attachment),
                }
              : {}),
          },
        }
      : {}),
    ...(attachments
      ? {
          attachments: attachments.map(toLightweightAttachment),
        }
      : {}),
  }));

const toLightweightAttachment = ({ name, path, contentType }: VitestArtifactAttachment): VitestArtifactAttachment => ({
  name,
  path,
  contentType,
});
