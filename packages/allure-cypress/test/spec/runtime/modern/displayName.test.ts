import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("displayName", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCommonsModulePath }) => `
    import { displayName } from "${allureCommonsModulePath}";

    it("sample", () => {
      displayName("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
