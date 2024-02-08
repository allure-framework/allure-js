export const label = (name: string, value: string) => {
  // @ts-ignore
  cy.allureLabel(name, value);
};
