import { attachment } from "../../dist"

describe("primitive data", () => {
  describe("text", () => {
    after(() => {
      cy.task("readLastTestResult").then((result) => {
        cy.wrap(result.tests).as("tests");

        cy.get("@tests").should("have.length", 1);
        cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
          cy.get("@tests").its(0).containsAttachment({
            name: "foo",
            source: attachment,
            type: "text/plain",
          });
        });
      });
    });

    it("text", () => {
      attachment("foo", "bar", "text/plain")
    });
  })

  describe("json", () => {
    after(() => {
      cy.task("readLastTestResult").then((result) => {
        cy.wrap(result.tests).as("tests");

        cy.get("@tests").should("have.length", 1);
        cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
          cy.get("@tests").its(0).containsAttachment({
            name: "foo",
            source: attachment,
            type: "application/json",
          });
        });
      });
    });

    it("json", () => {
      attachment("foo", JSON.stringify({ foo: "bar" }), "application/json")
    });
  })
})

describe("data from node", () => {
  describe("buffer", () => {
    after(() => {
      cy.task("readLastTestResult").then((result) => {
        cy.wrap(result.tests).as("tests");

        cy.get("@tests").should("have.length", 1);
        cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
          cy.get("@tests").its(0).containsAttachment({
            name: "foo",
            source: attachment,
            type: "application/json",
          });
        });
      });
    });

    it("json", () => {
      cy.task("readFile", { path: "package.json" }).then((content) => {
        attachment("foo", content, "application/json")
      })
    });
  })

  describe("utf8 string", () => {
    after(() => {
      cy.task("readLastTestResult").then((result) => {
        cy.wrap(result.tests).as("tests");

        cy.get("@tests").should("have.length", 1);
        cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
          cy.get("@tests").its(0).containsAttachment({
            name: "foo",
            source: attachment,
            type: "application/json",
          });
        });
      });
    });

    it("json", () => {
      cy.task("readFile", { path: "package.json", encoding: "utf8" }).then((content) => {
        attachment("foo", JSON.stringify(content, null, 2), "application/json", "utf8")
      })
    });
  })

  describe("base64 string", () => {
    after(() => {
      cy.task("readLastTestResult").then((result) => {
        cy.wrap(result.tests).as("tests");

        cy.get("@tests").should("have.length", 1);
        cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
          cy.get("@tests").its(0).containsAttachment({
            name: "foo",
            source: attachment,
            type: "application/json",
          });
        });
      });
    });

    it("json", () => {
      cy.task("readFile", { path: "package.json", encoding: "base64" }).then((content) => {
        attachment("foo", content, "application/json", "base64")
      })
    });
  })
})

describe("cypress read file", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
        cy.get("@tests").its(0).containsAttachment({
          name: "foo",
          source: attachment,
          type: "application/json",
        });
      });
    });
  });

  it("json", () => {
    cy.readFile("package.json", null).then((content) => {
      attachment("foo", content, "application/json")
    })
  });
})
