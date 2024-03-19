import "allure-cypress/commands";

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
Cypress.Commands.add("containsAttachment", { prevSubject: true }, (subject, attachment) => {
  cy.wrap(subject.attachments).should("deep.include", attachment)
})
Cypress.Commands.add("containsParameter", { prevSubject: true }, (subject, parameter) => {
  cy.wrap(subject.parameters).should("deep.include", parameter);
});
