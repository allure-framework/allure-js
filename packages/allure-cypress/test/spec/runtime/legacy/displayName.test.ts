import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils";

it("displayName", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCypressModulePath }) => `
    import { displayName } from "${allureCypressModulePath}";

    it("sample", () => {
      displayName("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
