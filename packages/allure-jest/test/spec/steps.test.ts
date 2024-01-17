import expect from "expect";
import { Status } from "allure-js-commons";
import { TestResultsByFullName, runJestTests } from "../utils";

describe("steps", () => {
  let results: TestResultsByFullName;

  beforeEach(async () => {
    results = await runJestTests(["./test/fixtures/steps.test.js"]);
  });

  describe("passed steps", () => {
    it("adds nested steps", () => {
      const { steps, labels } = results.passed;

      expect(labels).toContainEqual(
        expect.objectContaining({
          name: "foo",
          value: "bar",
        }),
      );
      expect(steps.length).toBe(1);
      expect(steps[0].name).toBe("first step name");
      expect(steps[0].steps.length).toBe(1);
      expect(steps[0].steps[0].name).toBe("second step name");
      expect(steps[0].steps[0].steps.length).toBe(1);
      expect(steps[0].steps[0].steps[0].name).toBe("third step name");
    });
  });

  describe("failed steps", () => {
    it("fails the test with original step error", () => {
      const { status, statusDetails, steps } = results.failed;

      expect(status).toBe(Status.FAILED);
      expect(statusDetails.message).toBe("foo");
      expect(steps).toHaveLength(1);
      expect(steps[0].name).toBe("first step name");
      expect(steps[0].status).toBe(Status.BROKEN);
      expect(steps[0].statusDetails.message).toBe("foo");
      expect(steps[0].steps.length).toBe(1);
      expect(steps[0].steps[0].name).toBe("second step name");
      expect(steps[0].steps[0].status).toBe(Status.BROKEN);
      expect(steps[0].steps[0].statusDetails.message).toBe("foo");
      expect(steps[0].steps[0].steps.length).toBe(1);
      expect(steps[0].steps[0].steps[0].name).toBe("third step name");
      expect(steps[0].steps[0].steps[0].status).toBe(Status.BROKEN);
      expect(steps[0].steps[0].steps[0].statusDetails.message).toBe("foo");
    });
  });
});
