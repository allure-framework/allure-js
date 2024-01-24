import { describe, expect, it } from "@jest/globals";
import { runJestInlineTest } from "../utils";

describe("parameters", () => {
  it("parameter", async () => {
    const { tests } = await runJestInlineTest(`
      it("parameter", async () => {
        await allure.parameter("foo", "bar", {
          excluded: false,
          mode: "hidden",
        });
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].parameters).toContainEqual(
      expect.objectContaining({
        name: "foo",
        value: "bar",
        excluded: false,
        mode: "hidden",
      }),
    );
  });
});
