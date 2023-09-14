import { Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { runHermione } from "../helper/run_helper";

describe("steps", () => {
  describe("passed steps", () => {
    it("adds nested steps", async () => {
      const { tests: results } = await runHermione(["./test/fixtures/steps.js"]);

      const { steps, labels } = getTestResultByName(results, "passed");
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
      const { tests: results } = await runHermione(["./test/fixtures/steps.js"]);

      const { status, statusDetails, steps, labels } = getTestResultByName(results, "failed");

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
