import { parameter } from "allure-cypress";

after(() => {
  cy.task("readLastTestResult").then((result) => {
    cy.wrap(result.tests).as("tests");

    cy.get("@tests").should("have.length", 1);
    cy.get("@tests").its(0).containsParameter({
      name: "foo",
      value: "bar",
      mode: "hidden",
      excluded: false,
    });
  });
});

it("parameter", () => {
  parameter("foo", "bar", {
    mode: "hidden",
    excluded: false
  })
});
