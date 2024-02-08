import { type MetadataMessage } from "allure-js-commons"

export const label = (name: string, value: string) => {
  // @ts-ignore
  cy.allureMetadataMessage({
    labels: [{ name, value }],
  } as MetadataMessage);
};
