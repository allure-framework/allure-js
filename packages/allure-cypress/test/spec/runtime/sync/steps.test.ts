import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCypressInlineTest } from "../../../utils.js";

it("handles sync runtime api", async () => {
  const { tests, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsSyncModulePath }) => `
      import { attachment, label, step } from "${allureCommonsSyncModulePath}";

      it("sync step", () => {
        label("mode", "sync");

        step("outer", (ctx) => {
          ctx.displayName("renamed outer");
          ctx.parameter("browser", "chromium");

          step("inner", () => {
            attachment("foo.txt", "bar", { contentType: "text/plain" });
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "mode", value: "sync" }));
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0]).toMatchObject({
    name: "renamed outer",
    status: Status.PASSED,
    parameters: [{ name: "browser", value: "chromium" }],
  });
  expect(tests[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps[0]).toMatchObject({
    name: "inner",
    status: Status.PASSED,
  });

  const [attachment] = tests[0].steps[0].steps[0].attachments;
  expect(attachment.name).toBe("foo.txt");
  expect(attachment.type).toBe("text/plain");
  expect(attachments[attachment.source] as string).toBe("bar");
});

it("rejects promise-returning sync steps", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsSyncModulePath }) => `
      import { step } from "${allureCommonsSyncModulePath}";

      it("sync step", () => {
        step("outer", () => new Cypress.Promise((resolve) => resolve()));
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.BROKEN);
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "outer",
      status: Status.BROKEN,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("must be synchronous"),
      }),
    }),
  );
});
