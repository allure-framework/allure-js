import { attachment } from "../../dist"

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
