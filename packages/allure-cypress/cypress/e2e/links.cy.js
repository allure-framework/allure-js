import { issue, link, tms, withMeta2 } from "../../dist";

describe("custom", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "foo",
        name: "bar",
        url: "https://allurereport.org",
      });
    });
  });

  it("custom", () => {
    link("foo", "https://allurereport.org", "bar");
  });
});

describe("issue", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "issue",
        name: "foo",
        url: "https://allurereport.org",
      });
    });
  });

  it("issue", () => {
    issue("https://allurereport.org", "foo");
  });
});

describe("short issue without name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "issue",
        name: "ISSUE-1",
        url: "https://allurereport.org/issues/ISSUE-1",
      });
    });
  });

  it("issue", () => {
    issue("ISSUE-1");
  });
});

describe("short issue with name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "issue",
        name: "foo",
        url: "https://allurereport.org/issues/ISSUE-1",
      });
    });
  });

  it("issue", () => {
    issue("ISSUE-1", "foo");
  });
});

describe("tms", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "tms",
        name: "foo",
        url: "https://allurereport.org",
      });
    });
  });

  it("tms", () => {
    tms("https://allurereport.org", "foo");
  });
});

describe("short tms without name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "tms",
        name: "TMS-1",
        url: "https://allurereport.org/tasks/TMS-1",
      });
    });
  });

  it("tms", () => {
    tms("TMS-1");
  });
});

describe("short tms with name", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLink({
        type: "tms",
        name: "foo",
        url: "https://allurereport.org/tasks/TMS-1",
      });
    });
  });

  it("tms", () => {
    tms("TMS-1", "foo");
  });
});

describe("static links", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its("[0].links").should("have.length", 4);
      cy.get("@tests").its(0).containsLink({
        name: "LINK-1",
        url: "https://outer-suite-link",
        type: "link",
      });
      cy.get("@tests").its(0).containsLink({
        name: "ISSUE-1",
        url: "https://allurereport.org/issues/1",
        type: "issue",
      });
      cy.get("@tests").its(0).containsLink({
        name: "TASK-1",
        url: "https://allurereport.org/tasks/1",
        type: "tms",
      });
      cy.get("@tests").its(0).containsLink({
        url: "https://test-link",
        type: "link",
      });
    });
  });

  withMeta2(
    link("link", "https://outer-suite-link", "LINK-1"),
    describe("outer", () => {
      withMeta2(
        link("issue", "1", "ISSUE-1"),
        describe("inner", () => {
          withMeta2(
            link("tms", "1", "TASK-1"),
            link("link", "https://test-link"),
            it("should have four links", () => {
              console.log(cy);
              console.log(Cypress);
            }),
          );
        }),
      );
    }),
  );
});
