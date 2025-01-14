import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils.js";

it("should handle global labels", async () => {
  const { tests } = await runCucumberInlineTest(
    ["examples"],
    ["examples"],
    undefined,
    (reporterFilePath) => `
    module.exports = {
      default: {
        paths: ["./**/*.feature"],
        format: ["summary", "${reporterFilePath}"],
        formatOptions: {
          globalLabels: [
            {
              name: "foo",
              value: "bar"
            }
          ]
        }
      }
    }
  `,
  );

  expect(tests).toHaveLength(2);
  expect(tests[0].labels[0]).toEqual({
    name: "foo",
    value: "bar",
  });
  expect(tests[1].labels[0]).toEqual({
    name: "foo",
    value: "bar",
  });
});
