import { link, issue, tms } from "../../dist";

describe("custom", () => {
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
})

describe("issue", () => {
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

  it("issue", () => {
    issue("foo", "http://allurereport.org");
  });
})

describe("tms", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "tms",
        name: "foo",
        url: "http://allurereport.org"
      });
    });
  });

  it("tms", () => {
    tms("foo", "http://allurereport.org");
  });
})
