import { inTest } from "./commands";
import {
  EndStepMessage,
  LabelName,
  LinkType,
  type MetadataMessage,
  type ParameterOptions,
  StartStepMessage,
  Status,
  type TestMetadata,
} from "./model";

declare global {
  namespace Cypress {
    interface Chainable {
      allureMetadataMessage(metadata: MetadataMessage): Chainable;

      allureStartStep(message: StartStepMessage): Chainable;

      allureEndStep(message: EndStepMessage): Chainable;
    }
  }
}

export type CypressWrappedAttachment = { type: string; data: unknown };

const dispatchTestMetadata = (metadata: TestMetadata) => {
  if (inTest()) {
    cy.allureMetadataMessage(metadata);
  }
  return metadata;
};

export const label = (name: string, value: string) =>
  dispatchTestMetadata({
    labels: [{ name, value }],
  });
export const link = (type: string, url: string, name?: string) =>
  dispatchTestMetadata({
    links: [{ type, url, name }],
  });
export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  cy.allureMetadataMessage({
    parameter: [{ name, value, ...options }],
  } as MetadataMessage);
};
export const description = (markdown: string) => dispatchTestMetadata({ description: markdown });
export const descriptionHtml = (html: string) => dispatchTestMetadata({ descriptionHtml: html });
export const testCaseId = (value: string) => {
  cy.allureMetadataMessage({
    testCaseId: value,
  } as MetadataMessage);
};
export const historyId = (value: string) => {
  cy.allureMetadataMessage({
    historyId: value,
  } as MetadataMessage);
};
export const allureId = (value: string) => {
  return label(LabelName.ALLURE_ID, value);
};
export const displayName = (name: string) => dispatchTestMetadata({ displayName: name });
export const issue = (url: string, name?: string) => {
  return link(LinkType.ISSUE, url, name);
};
export const tms = (url: string, name?: string) => {
  return link(LinkType.TMS, url, name);
};
export const epic = (name: string) => {
  return label(LabelName.EPIC, name);
};
export const feature = (name: string) => {
  return label(LabelName.FEATURE, name);
};
export const story = (name: string) => {
  return label(LabelName.STORY, name);
};
export const suite = (name: string) => {
  return label(LabelName.SUITE, name);
};
export const parentSuite = (name: string) => {
  return label(LabelName.PARENT_SUITE, name);
};
export const subSuite = (name: string) => {
  return label(LabelName.SUB_SUITE, name);
};
export const owner = (name: string) => {
  return label(LabelName.OWNER, name);
};
export const severity = (name: string) => {
  return label(LabelName.SEVERITY, name);
};
export const layer = (name: string) => {
  return label(LabelName.LAYER, name);
};
export const tag = (name: string) => {
  return label(LabelName.TAG, name);
};
export const attachment = (name: string, content: unknown, type: string, encoding: string = "utf8") => {
  const objectAttachment = typeof content === "object";

  // non-object attachment is a string and fully controllable by user
  if (!objectAttachment) {
    cy.allureMetadataMessage({
      attachments: [
        {
          name,
          content,
          type,
          encoding,
        },
      ],
    } as MetadataMessage);
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

  cy.allureMetadataMessage({
    attachments: [
      {
        content: attachmentContent,
        encoding: "base64",
        name,
        type,
      },
    ],
  } as MetadataMessage);
};
export const step = (name: string, body: () => void) => {
  cy.allureStartStep({ name });

  try {
    body();

    cy.allureEndStep({
      status: Status.PASSED,
    });
  } catch (err) {
    // all possible errors here are runtime ones
    // assertion errors could be handled in `commands.ts` by related mocha event
    cy.allureEndStep({
      status: Status.BROKEN,
      statusDetails: {
        message: (err as Error).message,
        trace: (err as Error).stack,
      },
    });

    throw err;
  }
};

export const withMeta = <T extends Mocha.Test | Mocha.Suite>(testOrSuite: T, ...metadata: TestMetadata[]): T => {
  const x: any = testOrSuite;
  x._allure_meta = [...(x._allure_meta ?? []), ...metadata];
  return testOrSuite;
};

export const withMeta2 = <TValue extends Mocha.Test | Mocha.Suite>(...args: [...TestMetadata[], TValue]): TValue => {
  const testOrSuite = args[args.length - 1] as TValue;
  const metadata = args.slice(0, -1) as ReadonlyArray<TestMetadata>;
  const state: any = testOrSuite;
  state._allure_meta = [...(state._allure_meta ?? []), ...metadata.filter((m) => m)];
  return testOrSuite;
};
