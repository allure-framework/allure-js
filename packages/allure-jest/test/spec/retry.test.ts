import { expect, it } from "vitest";
import { runJestInlineTest } from "../utils.js";

it("should work for test with retries", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      const { label } = require("allure-js-commons");

      jest.retryTimes(1);

      it("failure", async () => {
        await label("foo", "bar");

        expect(false).toBeTruthy();
      });
    `
  });

  expect(tests).toHaveLength(2);
  expect(tests[0].labels).toContainEqual(
    expect.objectContaining({
      name: "foo",
      value: "bar",
    }),
  );
  expect(tests[1].labels).toContainEqual(
    expect.objectContaining({
      name: "foo",
      value: "bar",
    }),
  );
});
