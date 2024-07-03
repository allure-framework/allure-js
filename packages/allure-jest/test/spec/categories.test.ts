import { describe, expect, it } from "vitest";
import { runJestInlineTest } from "../utils.js";

describe("categories", () => {
  it("should support categories", async () => {
    const { categories } = await runJestInlineTest({
      "sample.test.js": `
        it("sample test", async () => {});
      `
    });

    expect(categories).toEqual(expect.arrayContaining([{ name: "first" }, { name: "second" }]));
  });
});
