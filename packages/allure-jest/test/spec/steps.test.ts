import { Stage, Status } from "allure-js-commons";
import { expect } from "chai";
import { runJestTests, TestResultsByFullName } from "../utils";

describe("steps", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/steps.test.js"]);
  });

  describe("passed steps", () => {
    it("adds nested steps", () => {
      const { steps, labels } = results.passed;

      labels.should.include.something.that.deep.equals({
        name: "foo",
        value: "bar",
      });

      expect(steps.length).eq(1);
      expect(steps[0].name).eq("first step name");
      expect(steps[0].steps.length).eq(1);
      expect(steps[0].steps[0].name).eq("second step name");
      expect(steps[0].steps[0].steps.length).eq(1);
      expect(steps[0].steps[0].steps[0].name).eq("third step name");
    });
  });

  describe("failed steps", () => {
    it("fails the test with original step error", () => {
      const { status, statusDetails, steps } = results.failed;

      expect(status).eq(Status.FAILED);
      expect(statusDetails.message).eq("foo");
      expect(steps).to.have.length(1);
      expect(steps[0].name).eq("first step name");
      expect(steps[0].status).eq(Status.BROKEN);
      expect(steps[0].statusDetails.message).eq("foo");
      expect(steps[0].steps.length).eq(1);
      expect(steps[0].steps[0].name).eq("second step name");
      expect(steps[0].steps[0].status).eq(Status.BROKEN);
      expect(steps[0].steps[0].statusDetails.message).eq("foo");
      expect(steps[0].steps[0].steps.length).eq(1);
      expect(steps[0].steps[0].steps[0].name).eq("third step name");
      expect(steps[0].steps[0].steps[0].status).eq(Status.BROKEN);
      expect(steps[0].steps[0].steps[0].statusDetails.message).eq("foo");
    });
  });
});
