import { expect, it } from "vitest";
import { runJestInlineTest } from "../utils.js";

it("should handle global labels", async () => {
  const { tests } = await runJestInlineTest({
    "sample.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
    "jest.config.js": ({ allureJestNodePath }) => `
      const config = {
        bail: false,
        testEnvironment: "${allureJestNodePath}",
        testEnvironmentOptions: {
          globalLabels: [
            {
              name: "foo",
              value: "bar"
            }
          ]
        },
      };

      module.exports = config;
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels[0]).toEqual({
    name: "foo",
    value: "bar",
  });
});
