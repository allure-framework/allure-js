import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { Stage, Status, issue } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCypressInlineTest } from "../utils.js";

it("shouldn't break the flow when access storage after the page reload", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.visit("https://allurereport.org", { failOnStatusCode: false });
      cy.clearLocalStorage();
      cy.wait(200);
      cy.reload();
      cy.wait(200);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});

it.each(["localStorage", "sessionStorage"])("should report inaccessible %s after session setup", async (storage) => {
  issue("1623");
  const server = createServer((_, response) => response.end("<html><body>Session</body></html>"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const { tests } = await runCypressInlineTest({
      "cypress.config.js": ({ allureCypressReporterModulePath, supportFilePath, specPattern, allureDirPath }) => `
        const { allureCypress } = require("${allureCypressReporterModulePath}");
        module.exports = {
          e2e: {
            supportFile: "${supportFilePath}",
            specPattern: "${specPattern}",
            testIsolation: true,
            setupNodeEvents(on, config) {
              allureCypress(on, config, { resultsDir: "${allureDirPath}" });
              return config;
            },
          },
        };
      `,
      "cypress/e2e/sample.cy.js": () => `
        describe("session", () => {
          const setup = () => {
            cy.visit("${url}");
            cy.window().its("${storage}").invoke("setItem", "user", "test");
          };

          for (const name of ["creates session", "restores session"]) {
            it(name, () => {
              cy.session("user", setup);
              cy.visit("${url}");
              cy.window().then((win) => {
                expect(win.${storage}.getItem("user")).to.equal("test");
              });
            });
          }
        });
      `,
    });

    expect(tests).toHaveLength(2);
    for (const test of tests) {
      expect(test.status).toBe(Status.PASSED);
      expect(test.stage).toBe(Stage.FINISHED);
      expect(test.steps[0]).toMatchObject({ name: "session user", status: Status.PASSED });
    }

    const creation = tests.find((test) => test.name === "creates session")!;
    expect(creation.steps[0].steps[0]).toMatchObject({
      name: "Create new session",
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: `its .${storage}`,
          status: Status.PASSED,
          parameters: expect.arrayContaining([{ name: "Yielded", value: "[Unserializable value]" }]),
        }),
        expect.objectContaining({
          name: "invoke .setItem()",
          status: Status.PASSED,
          parameters: expect.arrayContaining([
            { name: "Subject", value: "[Unserializable value]" },
            { name: "With Arguments", value: '["user","test"]' },
          ]),
        }),
      ]),
    });
    const restoration = tests.find((test) => test.name === "restores session")!;
    expect(restoration.steps[0].steps[0]).toMatchObject({ name: "Restore saved session", status: Status.PASSED });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
