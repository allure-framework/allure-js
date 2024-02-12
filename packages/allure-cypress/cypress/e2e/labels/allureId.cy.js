import { allureId } from "../../../dist";

after(() => {
  cy.task("readLastTestResult").then((result) => {
    cy.wrap(result.tests).as("tests");

    cy.get("@tests").should("have.length", 1);
    cy.get("@tests").its(0).containsLabel({
      name: "ALLURE_ID",
      value: "foo",
    });
  });
});

it("allureId", () => {
  allureId("foo");
});
