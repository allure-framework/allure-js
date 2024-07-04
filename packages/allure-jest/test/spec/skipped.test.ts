import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("skipped test", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      it.skip("skipped", () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
});

it("test inside skipped suite", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      describe.skip("suite", () => {
        it("skipped", () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
});
