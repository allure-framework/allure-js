import { description, descriptionHtml } from "allure-cypress";

after(() => {
  cy.task("readLastTestResult").then((result) => {
    cy.wrap(result.tests).as("tests");

    cy.get("@tests").should("have.length", 1);
    cy.get("@tests").its(0).matches({
      description: "foo",
      descriptionHtml: "bar",
    });
  });
});

it("description", () => {
  description("foo");
  descriptionHtml("bar");
});
