import { step } from "allure-cypress";

describe("single", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests")
        .its(0)
        .its("steps")
        .then((steps) => {
          cy.wrap(steps).should("have.length", 2);
          cy.wrap(steps).its(0).its("name").should("eq", "foo");
          cy.wrap(steps).its(0).its("status").should("eq", "passed");
          cy.wrap(steps).its(1).its("name").should("eq", "bar");
          cy.wrap(steps).its(1).its("status").should("eq", "passed");
        });
    });
  });

  it("step", () => {
    step("foo", () => {
      cy.log("foo");
    });
    step("bar", () => {
      cy.log("bar");
    });
  });
});

describe("nested", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests")
        .its(0)
        .its("steps")
        .then((steps) => {
          cy.wrap(steps).should("have.length", 2);
          cy.wrap(steps).its(0).its("name").should("eq", "foo");
          cy.wrap(steps).its(1).its("name").should("eq", "baz");
        });
      cy.get("@tests").its(0).its("steps").its(0).its("steps").should("have.length", 1);
      cy.get("@tests")
        .its(0)
        .its("steps")
        .its(0)
        .its("steps")
        .then((steps) => {
          cy.wrap(steps).should("have.length", 1);
          cy.wrap(steps).its(0).its("name").should("eq", "bar");
        });
    });
  });

  it("step", () => {
    step("foo", () => {
      step("bar", () => {
        cy.log("hello");
      });
    });
    step("baz", () => {
      cy.log("world");
    })
  });
});

describe("with screenshot", () => {
  after(() => {
    cy.task("readLastTestResult").then((result) => {
      cy.wrap(result.tests).as("tests");

      cy.get("@tests").should("have.length", 1);
      cy.get("@tests")
        .its(0)
        .its("steps")
        .then((steps) => {
          cy.wrap(steps).its(0).its("name").should("eq", "foo");
        });
      cy.get("@tests").its(0).its("steps").its(0).its("steps").should("have.length", 1);
      cy.wrap(Object.keys(result.attachments)).its(0).then((attachment) => {
        cy.get("@tests").its(0).its("steps").its(0).its("steps").its(0).as("lastStep");
        cy.get("@lastStep").containsAttachment({
          name: "Screenshot",
          source: attachment,
          type: "image/png",
        })
      });
    });
  });

  it("step", () => {
    step("foo", () => {
      step("bar", () => {
        cy.screenshot();
      });
    });
  });
});

// TODO: test specs with failed steps
// describe("with assertion error", () => {
//   after(() => {
//     cy.task("readLastTestResult").then((result) => {
//       cy.wrap(result.tests).as("tests");
//
//       cy.get("@tests").should("have.length", 1);
//     });
//   });
//
//   it("step @allure.label.keep_failed=1", () => {
//     step("foo", () => {
//       step("bar", () => {
//         step("baz", () => {
//           cy.wrap(1).should("eq", 2)
//         })
//       })
//     });
//   });
// });
//
// describe("with cypress error", () => {
//   after(() => {
//     cy.task("readLastTestResult").then((result) => {
//       cy.wrap(result.tests).as("tests");
//
//       cy.get("@tests").should("have.length", 1);
//     });
//   });
//
//   it("step @allure.label.keep_failed=1", () => {
//     step("foo", () => {
//       step("bar", () => {
//         step("baz", () => {
//           cy.get(".foo")
//         })
//       })
//     });
//   });
// });
//
// describe("with unexpected error", () => {
//   after(() => {
//     cy.task("readLastTestResult").then((result) => {
//       cy.wrap(result.tests).as("tests");
//
//       cy.get("@tests").should("have.length", 1);
//     });
//   });
//
//   it("step @allure.label.keep_failed=1", () => {
//     step("foo", () => {
//       step("bar", () => {
//         step("baz", () => {
//           throw new Error("foo")
//         })
//       })
//     });
//   });
// });
