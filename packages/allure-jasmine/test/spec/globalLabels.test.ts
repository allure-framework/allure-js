import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../utils.js";

it("sets allure labels from env variables", async () => {
  const { tests } = await runJasmineInlineTest(
    {
      "spec/test/sample1.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
    },
    {
      ALLURE_LABEL_A: "a",
      ALLURE_LABEL_B: "b",
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: "A", value: "a" },
      { name: "B", value: "b" },
    ]),
  );
});
