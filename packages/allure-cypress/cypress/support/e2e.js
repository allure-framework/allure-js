import "../../dist/commands";

Cypress.Commands.add("matches", { prevSubject: true }, (subject, object) => {
  cy.wrap(subject).then((subject) => {
    Object.keys(object).forEach((key) => {
      expect(subject[key]).to.eql(object[key]);
    });
  });
});
Cypress.Commands.add("containsLabel", { prevSubject: true }, (subject, label) => {
  cy.wrap(subject.labels).should("deep.include", label);
});
Cypress.Commands.add("containsLink", { prevSubject: true }, (subject, link) => {
  cy.wrap(subject.links).should("deep.include", link);
});
