import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../utils.js";

it("should handle global labels", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/sample.spec.js": `
    it("should pass 1", () => {
      expect(true).toBe(true);
    });
  `,
    "spec/helpers/allure.js": `
  const AllureJasmineReporter = require("allure-jasmine");

  const reporter = new AllureJasmineReporter({
    testMode: true,
    globalLabels: [
      {
        name: "foo",
        value: "bar"
      }
    ]
  });

  jasmine.getEnv().addReporter(reporter);
`,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels[0]).toEqual({
    name: "foo",
    value: "bar",
  });
});
