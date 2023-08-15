import { Status, TestResult } from "allure-js-commons";
import { expect } from "chai";
import Hermione from "hermione";
import { before, beforeEach, describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { HermioneAllure } from "../types";

describe("steps", () => {
  let results: TestResult[];

  before(async () => {
    const hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;

    await hermione.run(["./test/fixtures/steps.js"], {});

    results = hermione.allure.writer.results;
  });

  describe("passed steps", () => {
    it("adds nested steps", async () => {
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
    it("fails the test with original step error", () => {
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
