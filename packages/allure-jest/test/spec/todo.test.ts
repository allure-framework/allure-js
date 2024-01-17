import expect from "expect";
import { Stage, Status } from "allure-js-commons";
import { TestResultsByFullName, runJestTests } from "../utils";

describe("todo", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/todo.test.js"]);
  });

  it("marks todo tests as skipped", () => {
    const { stage, status } = results.todo;

    expect(stage).toBe(Stage.PENDING);
    expect(status).toBe(Status.SKIPPED);
  });
});
