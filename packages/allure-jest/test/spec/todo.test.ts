import { Stage, Status } from "allure-js-commons";
import { expect } from "chai";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("todo", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/todo.test.js"]);
  });

  it("marks todo tests as skipped", () => {
    const { stage, status } = results.todo;

    expect(stage).eq(Stage.PENDING);
    expect(status).eq(Status.SKIPPED);
  });
});
