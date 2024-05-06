import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils";

it("skipped test", async () => {
  const { tests } = await runJasmineInlineTest(`
    xit("skipped", () => {});
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
});

it("test inside skipped suite", async () => {
  const { tests } = await runJasmineInlineTest(`
    xdescribe("suite", () => {
      it("skipped", () => {});
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
});
