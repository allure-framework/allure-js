import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import {
  cleanResults,
  findStatusDetails,
  findTest,
  runTests,
  whenResultsAppeared
} from "../utils";

@suite
class FlakySuite {
  before() {
    cleanResults();
    runTests("flaky");
  }

  @test
  shouldHaveFlakyStatus() {
    const testName = "shouldHighlightAsFlaky";
    return whenResultsAppeared().then(() => {
      expect(findTest("Flaky")).not.eq(undefined);
      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findStatusDetails(testName, "flaky")).to.equal(true);
    });
  }
}
