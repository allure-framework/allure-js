import { issue } from "../../../dist";

after(() => {
  cy.task("readLastTestResult").then((result) => {
    cy.wrap(result.tests).as("tests");

    cy.get("@tests").should("have.length", 1);
    cy.get("@tests").its(0).containsLink({
      type: "issue",
      name: "foo",
      url: "http://allurereport.org"
    });
  });
});

it("custom", () => {
  issue("foo", "http://allurereport.org");
});
