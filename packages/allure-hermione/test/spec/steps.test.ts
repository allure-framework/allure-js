import { Status, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { beforeEach, describe, it } from "mocha";
import Sinon from "sinon";
import { runHermioneTests } from "../runner";

describe("steps", () => {
  beforeEach(() => {
    Sinon.restore();
  });

  describe("passed steps", () => {
    it("adds nested steps", async () => {
      const results = await runHermioneTests(["./test/fixtures/passedSteps.js"]);
      const { steps, labels } = results[0];
      const customLabel = labels.find(({ name }) => name === "foo");

      expect(customLabel!.value).eq("bar");
      expect(steps.length).eq(1);
      expect(steps[0].name).eq("first step name");
      expect(steps[0].steps.length).eq(1);
      expect(steps[0].steps[0].name).eq("second step name");
      expect(steps[0].steps[0].steps.length).eq(1);
      expect(steps[0].steps[0].steps[0].name).eq("third step name");
    });
  });

  describe("failed steps", () => {
    it("fails the test with original step error", async () => {
      const results = await runHermioneTests(["./test/fixtures/failedSteps.js"]);
      const { status, statusDetails, steps } = results[0];

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
