import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils.js";

it("should add categories", async () => {
  const { categories } = await runCucumberInlineTest(["simple"], ["simple"]);
  expect(categories).toEqual(expect.arrayContaining([{ name: "first" }, { name: "second" }]));
});
