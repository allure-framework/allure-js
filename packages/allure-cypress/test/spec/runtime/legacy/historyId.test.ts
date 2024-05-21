import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils";

it("historyId", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCypressModulePath }) => `
    import { historyId } from "${allureCypressModulePath}";

    it("sample", () => {
      historyId("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
