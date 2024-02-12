import { LabelName, LinkType, type MetadataMessage, type ParameterOptions } from "./model";

declare global {
  namespace Cypress {
    interface Chainable {
      allureMetadataMessage(metadata: MetadataMessage): Chainable<void>
    }
  }
}

export const label = (name: string, value: string) => {
  cy.allureMetadataMessage({
    labels: [{ name, value }],
  } as MetadataMessage);
};
export const link = (type: string, url: string, name?: string) => {
  cy.allureMetadataMessage({
    links: [{ type, url, name }],
  } as MetadataMessage);
};
export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  cy.allureMetadataMessage({
    parameters: [{ name, value, ...options }],
  } as MetadataMessage);
};
export const description = (markdown: string) => {
  cy.allureMetadataMessage({
    description: markdown,
  } as MetadataMessage);
};
export const descriptionHtml = (html: string) => {
  cy.allureMetadataMessage({
    descriptionHtml: html,
  } as MetadataMessage);
};
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
  cy.allureMetadataMessage({
    labels: [{ name: LabelName.ALLURE_ID, value }],
  } as MetadataMessage);
};
export const displayName = (name: string) => {
  cy.allureMetadataMessage({
    displayName: name,
  } as MetadataMessage);
};
export const issue = (name: string, url: string) => {
  link(LinkType.ISSUE, url, name);
};
export const tms = (name: string, url: string) => {
  link(LinkType.TMS, url, name);
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
export const attachment = (name: string, content: Buffer | string, type: string) => {
  cy.allureMetadataMessage({
    attachments: [{ name, content, type }],
  } as MetadataMessage);
};
// TODO: step
// export const step = (name: string, body: () => Promise<void>) => {
//   console.log("step", { name, body });
// };