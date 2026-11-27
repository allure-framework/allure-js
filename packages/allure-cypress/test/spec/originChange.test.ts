import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCypressInlineTest } from "../utils.js";

// When a test's baseUrl has a different origin to the previous test's, Cypress reloads the page and runs the spec again
// from the start, skipping the tests that already ran
it("should report each test once, in its own suites, when tests need different origins", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      describe("sites", () => {
        ["https://one.example.com", "https://two.example.org", "https://three.example.net"].forEach((site) => {
          it(\`visits \${site}\`, { baseUrl: site }, () => {
            cy.intercept("GET", \`\${site}/\`, { headers: { "content-type": "text/html" }, body: "<html></html>" });
            cy.visit("/");
            cy.location("origin").should("eq", site);
          });
        });
      });
    `,
  });

  const summaries = tests
    .map(({ name, status, labels, titlePath }) => ({
      name,
      status,
      suites: labels
        .filter((label) => ["parentSuite", "suite", "subSuite"].includes(label.name))
        .map((label) => `${label.name}: ${label.value}`),
      titlePath: titlePath?.slice(-2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  expect(summaries).toEqual(
    ["https://one.example.com", "https://three.example.net", "https://two.example.org"].map((site) => ({
      name: `visits ${site}`,
      status: Status.PASSED,
      suites: ["parentSuite: sites"],
      titlePath: ["sample.cy.js", "sites"],
    })),
  );
});
