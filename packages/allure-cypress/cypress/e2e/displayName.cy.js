import { displayName, withMeta } from "../../dist";

describe("dynamic", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).matches({
        name: "foo",
      });
    });
  });

  it("displayName", () => {
    displayName("foo");
  });
});

describe("static", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).matches({
        name: "foo-static",
      });
    });
  });

  withMeta(
    it("displayName", () => {}),
    displayName("foo-static"),
  );
});
