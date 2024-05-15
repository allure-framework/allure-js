import { expect, it } from "@jest/globals";
import { runJestInlineTest } from "../utils";

it("should work for test with retries", async () => {
  const { tests, processError } = await runJestInlineTest(`
    const { label } = require("allure-js-commons/new");

    jest.retryTimes(1);

    it("failure", async () => {
      await label("foo", "bar");

      expect(false).toBeTruthy();
    });
  `);

  expect(processError).toContain("FAIL");
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
