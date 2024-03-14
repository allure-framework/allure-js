import { link, issue, tms } from "allure-cypress";

describe("custom", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        name: "foo",
        type: "bar",
        url: "https://allurereport.org",
      });
    });
  });

  it("custom", () => {
    link("https://allurereport.org", "foo", "bar");
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
        url: "https://allurereport.org"
      });
    });
  });

  it("issue", () => {
    issue("https://allurereport.org", "foo");
  });
})

describe("short issue without name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "issue",
        name: "ISSUE-1",
        url: "https://allurereport.org/issues/ISSUE-1"
      });
    });
  });

  it("issue", () => {
    issue("ISSUE-1");
  });
})

describe("short issue with name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "issue",
        name: "foo",
        url: "https://allurereport.org/issues/ISSUE-1"
      });
    });
  });

  it("issue", () => {
    issue("ISSUE-1", "foo");
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
        url: "https://allurereport.org"
      });
    });
  });

  it("tms", () => {
    tms("https://allurereport.org", "foo");
  });
})

describe("short tms without name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "tms",
        name: "TMS-1",
        url: "https://allurereport.org/tasks/TMS-1"
      });
    });
  });

  it("tms", () => {
    tms("TMS-1");
  });
})

describe("short tms with name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "tms",
        name: "foo",
        url: "https://allurereport.org/tasks/TMS-1"
      });
    });
  });

  it("tms", () => {
    tms("TMS-1", "foo");
  });
})
