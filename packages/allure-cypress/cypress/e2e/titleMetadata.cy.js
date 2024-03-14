import { label } from "allure-cypress";

after(() => {
  cy.task("readLastTestResult").then((result) => {
    cy.wrap(result.tests).as("tests");

    cy.get("@tests").should("have.length", 1);
    cy.get("@tests").its(0).containsLabel({
      name: "ALLURE_ID",
      value: "1",
    });
    cy.get("@tests").its(0).containsLabel({
      name: "foo",
      value: "2",
    });
    cy.get("@tests").its(0).containsLabel({
      name: "bar",
      value: "3",
    });
  });
});

it("foo @allure.id=1 @allure.label.foo=2", () => {
  label("bar", "3");
});
