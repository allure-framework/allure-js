import { LabelName, LinkType, MessageType, type ParameterOptions, ReporterMessage, Stage, Status } from "./model";

declare global {
  namespace Cypress {
    interface Chainable {
      allureReporterMessage(message: ReporterMessage): Chainable;
    }
  }
}

export type CypressWrappedAttachment = { type: string; data: unknown };

export const label = (name: string, value: string) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      labels: [{ name, value }],
    },
  });
};
export const link = (url: string, name?: string, type?: string) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      links: [{ type, url, name }],
    },
  });
};
export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      parameter: [{ name, value, ...options }],
    },
  });
};
export const description = (markdown: string) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      description: markdown,
    },
  });
};
export const descriptionHtml = (html: string) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      descriptionHtml: html,
    },
  });
};
export const testCaseId = (value: string) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      testCaseId: value,
    },
  });
};
export const historyId = (value: string) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      historyId: value,
    },
  });
};
export const allureId = (value: string) => {
  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      labels: [{ name: LabelName.ALLURE_ID, value }],
    },
  });
};
export const displayName = (name: string) => {
  cy.now("allureReporterMessage", {
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
export const attachment = (name: string, content: unknown, type: string, encoding: string = "utf8") => {
  const objectAttachment = typeof content === "object";

  // non-object attachment is a string and fully controllable by user
  if (!objectAttachment) {
    cy.now("allureReporterMessage", {
      type: MessageType.METADATA,
      payload: {
        attachments: [
          {
            content: content as string,
            encoding: encoding as BufferEncoding,
            name,
            type,
          },
        ],
      },
    });
    return;
  }

  let attachmentContent: string;

  switch ((content as CypressWrappedAttachment).type) {
    case "Buffer":
      // convert Uint8Array to base64 string
      attachmentContent = btoa(String.fromCharCode.apply(null, (content as CypressWrappedAttachment).data) as string);
      break;
    default:
      // don't know is the case possible, but better to add default case processing
      attachmentContent = (content as CypressWrappedAttachment).data as string;
  }

  cy.now("allureReporterMessage", {
    type: MessageType.METADATA,
    payload: {
      attachments: [
        {
          content: attachmentContent,
          encoding: "base64",
          name,
          type,
        },
      ],
    },
  });
};
export const step = (name: string, body: () => void) => {
  cy.wrap(null)
    .then(() => {
      cy.now("allureReporterMessage", {
        type: MessageType.STEP_STARTED,
        payload: { name, start: Date.now() },
      });

      body();
    })
    .then(() => {
      cy.now("allureReporterMessage", {
        type: MessageType.STEP_ENDED,
        payload: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
    });
};
