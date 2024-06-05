import { expect, it } from "vitest";
import { runJestInlineTest } from "../utils.js";

it("doesn't report tests with the same name several times", async () => {
  const { tests } = await runJestInlineTest(`
    it("has the same name", () => {});

    it("has the same name", () => {});
  `);

  expect(tests).toHaveLength(1);
});
