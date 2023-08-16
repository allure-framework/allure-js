import type { TestResult } from "allure-js-commons";
import { runJestTests } from "../utils";

describe("labels", () => {
  let results: TestResult[];

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/labels.test.js"]);
  });

  it("do something", () => {
    const { labels } = results[0];

    labels.should.include.something.that.deep.equals({
      name: "foo",
      value: "bar",
    });
  });
});
