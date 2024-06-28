import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("parameters", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import { parameter } from "${allureCommonsModulePath}";

    it("adds parameter", () => {
      parameter("foo", "bar", {
        mode: "hidden",
        excluded: false
      })
    });
    `,
});

  expect(tests).toHaveLength(1);
  expect(tests[0].parameters).toContainEqual({
    name: "foo",
    value: "bar",
    mode: "hidden",
    excluded: false,
  });
});
