import { Stage, Status } from "allure-js-commons";
import { expect } from "chai";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("each", () => {
  it("handles all the 3 tests with data tables", async () => {
    const results = await runJestTests(["./test/fixtures/dataTable.test.js"]);
    const values = Object.values(results);

    expect(values).length(3);

    values.should.include.something.like({
      name: "1 + 2 = 3",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    values.should.include.something.like({
      name: "2 + 3 = 5",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    values.should.include.something.like({
      name: "3 + 4 = 7",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
  });
});
