import { Stage, Status } from "allure-js-commons";
import expect from "expect";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("skipped", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/skipped.test.js"]);
  });

  it("marks skipped test as skipped", () => {
    const { stage, status } = results.skipped;

    expect(stage).toBe(Stage.PENDING);
    expect(status).toBe(Status.SKIPPED);
  });

  it("marks test inside skipped suite as skipped", () => {
    const { stage, status } = results["suite skipped"];

    expect(stage).toBe(Stage.PENDING);
    expect(status).toBe(Status.SKIPPED);
  });
});
