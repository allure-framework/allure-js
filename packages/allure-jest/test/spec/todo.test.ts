import { expect, it } from "@jest/globals";
import { Stage, Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils";

it("todo", async () => {
  const { tests } = await runJestInlineTest(`
      it.todo("todo")
    `);

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
});
