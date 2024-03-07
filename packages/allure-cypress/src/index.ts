import { LabelName, LinkType, MessageType, type ParameterOptions, Stage, Status } from "./model";
import { pushReportMessage } from "./utils";

export type CypressWrappedAttachment = { type: string; data: unknown };

export const uint8ArrayToBase64 = (data: unknown) => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (!u8arrayLike) {
    return data as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return btoa(String.fromCharCode.apply(null, data));
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
    type: MessageType.METADATA,
    payload: {
      labels: [{ name, value }],
    },
  });
};
export const link = (url: string, name?: string, type?: string) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
      links: [{ type, url, name }],
    },
  });
};
export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
      parameter: [{ name, value, ...options }],
    },
  });
};
export const description = (markdown: string) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
      description: markdown,
    },
  });
};
export const descriptionHtml = (html: string) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
      descriptionHtml: html,
    },
  });
};
export const testCaseId = (value: string) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
      testCaseId: value,
    },
  });
};
export const historyId = (value: string) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
      historyId: value,
    },
  });
};
export const allureId = (value: string) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
      labels: [{ name: LabelName.ALLURE_ID, value }],
    },
  });
};
export const displayName = (name: string) => {
  pushReportMessage({
    type: MessageType.METADATA,
    payload: {
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
    type: MessageType.METADATA,
    payload: {
      attachments: [
        {
          content: attachmentContent,
          encoding: actualEncoding,
          name,
          type,
        },
      ],
    },
  });
};
export const step = (name: string, body: () => void) => {
  cy.wrap(null, { log: false })
    .then(() => {
      pushReportMessage({
        type: MessageType.STEP_STARTED,
        payload: { name, start: Date.now() },
      });

      body();
    })
    .then(() => {
      pushReportMessage({
        type: MessageType.STEP_ENDED,
        payload: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
    });
};
