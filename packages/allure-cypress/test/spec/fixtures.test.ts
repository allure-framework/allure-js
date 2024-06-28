import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons"
import { runCypressInlineTest } from "../utils.js";

it("handles native cypress fixtures with allure attachments inside", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import { attachment } from "${allureCommonsModulePath}";

    it("with commands", () => {
      cy.fixture("sample.json").then((data) => {
        attachment("foo", JSON.stringify(data, null, 2), "application/json");
      })
    });
    `,
    "cypress/fixtures/sample.json": () => JSON.stringify({ foo: "foo" }, null, 2),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(expect.objectContaining({
    attachments: expect.arrayContaining([
      expect.objectContaining({
        name: "foo",
        type: ContentType.JSON,
      }),
    ]),
  }))
});
