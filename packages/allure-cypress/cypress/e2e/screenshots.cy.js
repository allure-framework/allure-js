describe("unnamed", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
        cy.get("@tests").its(0).containsAttachment({
          name: "Screenshot",
          source: attachment,
          type: "image/png",
        });
      });
    });
  });

  it("screenshot", () => {
    cy.screenshot();
  });
})

describe("named", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
        cy.get("@tests").its(0).containsAttachment({
          name: "foo",
          source: attachment,
          type: "image/png",
        });
      });
    });
  });

  it("screenshot", () => {
    cy.screenshot("foo");
  });
})
