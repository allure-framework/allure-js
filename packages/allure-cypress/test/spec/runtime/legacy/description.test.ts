import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils";

it("description", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCypressModulePath }) => `
    import { description } from "${allureCypressModulePath}";

    it("markdown", () => {
      description("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("descriptionHtml", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCypressModulePath }) => `
    import { descriptionHtml } from "${allureCypressModulePath}";

    it("html", () => {
      descriptionHtml("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
