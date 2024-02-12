import { link } from "../../../dist";

after(() => {
  cy.task("readLastTestResult").then((result) => {
    cy.wrap(result.tests).as("tests");

    cy.get("@tests").should("have.length", 1);
    cy.get("@tests").its(0).containsLink({
      type: "foo",
      name: "bar",
      url: "http://allurereport.org",
    });
  });
});

it("custom", () => {
  link("foo", "http://allurereport.org", "bar");
});
