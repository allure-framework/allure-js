import { Stage, Status } from "allure-js-commons";
import { expect } from "chai";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("skipped", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/skipped.test.js"]);
  });

  it("marks skipped test as skipped", () => {
    const { stage, status } = results.skipped;

    expect(stage).eq(Stage.PENDING);
    expect(status).eq(Status.SKIPPED);
  });

  it("marks test inside skipped suite as skipped", () => {
    const { stage, status } = results["suite skipped"];

    expect(stage).eq(Stage.PENDING);
    expect(status).eq(Status.SKIPPED);
  });
});
