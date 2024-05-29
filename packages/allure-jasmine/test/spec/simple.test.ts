import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils.js";

it("handles jasmine tests", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample1.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
    "spec/test/sample2.spec.js": `
      it("should fail", () => {
        expect(true).toBe(false);
      });
    `,
    "spec/test/sample3.spec.js": `
      it("should break", () => {
        throw new Error("foo");
      });
    `,
  });

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "should fail",
        status: Status.FAILED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "should break",
        status: Status.BROKEN,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});
