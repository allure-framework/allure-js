import { LabelName, LinkType, ParameterOptions, Stage, Status } from "allure-js-commons/new";
import { pushReportMessage } from "./utils.js";

export type CypressWrappedAttachment = { type: string; data: unknown };

export const uint8ArrayToBase64 = (data: unknown) => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (!u8arrayLike) {
    return data as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return btoa(String.fromCharCode.apply(null, data as number[]));
};

export const normalizeAttachmentContentEncoding = (data: unknown, encoding: BufferEncoding): BufferEncoding => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (u8arrayLike) {
    return "base64";
  }

  return encoding;
};

export const label = (name: string, value: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      labels: [{ name, value }],
    },
  });
};
export const link = (url: string, name?: string, type?: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      links: [{ type, url, name }],
    },
  });
};
export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  pushReportMessage({
    type: "metadata",
    data: {
      parameters: [{ name, value, ...options }],
    },
  });
};
export const description = (markdown: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      description: markdown,
    },
  });
};
export const descriptionHtml = (html: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      descriptionHtml: html,
    },
  });
};
export const testCaseId = (value: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      testCaseId: value,
    },
  });
};
export const historyId = (value: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      historyId: value,
    },
  });
};
export const allureId = (value: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      labels: [{ name: LabelName.ALLURE_ID, value }],
    },
  });
};
export const displayName = (name: string) => {
  pushReportMessage({
    type: "metadata",
    data: {
      displayName: name,
    },
  });
};
export const issue = (url: string, name?: string) => {
  link(url, name, LinkType.ISSUE);
};
export const tms = (url: string, name?: string) => {
  link(url, name, LinkType.TMS);
};
export const epic = (name: string) => {
  label(LabelName.EPIC, name);
};
export const feature = (name: string) => {
  label(LabelName.FEATURE, name);
};
export const story = (name: string) => {
  label(LabelName.STORY, name);
};
export const suite = (name: string) => {
  label(LabelName.SUITE, name);
};
export const parentSuite = (name: string) => {
  label(LabelName.PARENT_SUITE, name);
};
export const subSuite = (name: string) => {
  label(LabelName.SUB_SUITE, name);
};
export const owner = (name: string) => {
  label(LabelName.OWNER, name);
};
export const severity = (name: string) => {
  label(LabelName.SEVERITY, name);
};
export const layer = (name: string) => {
  label(LabelName.LAYER, name);
};
export const tag = (name: string) => {
  label(LabelName.TAG, name);
};
export const attachment = (
  name: string,
  content: unknown,
  type: string = "text/plain",
  encoding: BufferEncoding = "utf8",
) => {
  // @ts-ignore
  const attachmentRawContent: string | Uint8Array = content?.type === "Buffer" ? content.data : content;
  const actualEncoding = normalizeAttachmentContentEncoding(attachmentRawContent, encoding);
  const attachmentContent = uint8ArrayToBase64(attachmentRawContent);

  pushReportMessage({
    type: "raw_attachment",
    data: {
      content: attachmentContent,
      encoding: actualEncoding,
      contentType: type,
      name,
    },
  });
};
export const step = (name: string, body: () => void) => {
  cy.wrap(null, { log: false })
    .then(() => {
      pushReportMessage({
        type: "step_start",
        data: { name, start: Date.now() },
      });

      body();
    })
    .then(() => {
      pushReportMessage({
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
    });
};
