import {
  allureId,
  epic,
  feature,
  label,
  layer,
  owner,
  parentSuite,
  severity,
  story,
  subSuite,
  suite,
  tag,
} from "allure-cypress";

describe("custom", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.log(result)
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "foo",
        value: "bar",
      });
    });
  });

  it("custom", () => {
    label("foo", "bar");
  });
});

describe("allureId", () => {
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
});

describe("epic", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "epic",
        value: "foo",
      });
    });
  });

  it("epic", () => {
    epic("foo");
  });
});

describe("feature", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "feature",
        value: "foo",
      });
    });
  });

  it("feature", () => {
    feature("foo");
  });
});

describe("layer", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "layer",
        value: "foo",
      });
    });
  });

  it("layer", () => {
    layer("foo");
  });
});

describe("owner", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "owner",
        value: "foo",
      });
    });
  });

  it("owner", () => {
    owner("foo");
  });
});

describe("parentSuite", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "parentSuite",
        value: "foo",
      });
    });
  });

  it("parentSuite", () => {
    parentSuite("foo");
  });
});

describe("severity", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "severity",
        value: "foo",
      });
    });
  });

  it("severity", () => {
    severity("foo");
  });
});

describe("story", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "story",
        value: "foo",
      });
    });
  });

  it("story", () => {
    story("foo");
  });
});

describe("subSuite", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "subSuite",
        value: "foo",
      });
    });
  });

  it("subSuite", () => {
    subSuite("foo");
  });
});

describe("suite", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "suite",
        value: "foo",
      });
    });
  });

  it("suite", () => {
    suite("foo");
  });
});

describe("tag", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests").its(0).containsLabel({
        name: "tag",
        value: "foo",
      });
    });
  });

  it("tag", () => {
    tag("foo");
  });
});
