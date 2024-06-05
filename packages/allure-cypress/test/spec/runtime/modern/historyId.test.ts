import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("historyId", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCommonsModulePath }) => `
    import { historyId } from "${allureCommonsModulePath}";

    it("sample", () => {
      historyId("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
