import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import {
  cleanResults,
  findParameter,
  findTest,
  runTests,
  whenResultsAppeared
} from "../utils";

@suite
class ParameterSuite {
  before() {
    cleanResults();
    runTests("parameter");
  }

  @test
  shouldHaveParameter() {
    const testName = "shouldAssignParameter";
    return whenResultsAppeared().then(() => {
      expect(findTest("Parameter")).not.eq(undefined);

      expect(findTest(testName).status).eq(Status.PASSED);
      expect(findParameter(testName, "key").value).eq("value");
    });
  }
}
