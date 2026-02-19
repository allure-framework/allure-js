import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("handles jest tests", async () => {
  const { tests } = await runJestInlineTest({
    "sample.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});

it("should set full name", async () => {
  const { tests } = await runJestInlineTest({
    "a/path/to/test/sample.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass",
        fullName: "allure-jest:a/path/to/test/sample.spec.js#should pass",
        status: Status.PASSED,
      }),
    ]),
  );
});
