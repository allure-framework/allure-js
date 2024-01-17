import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { findParameter, runTests } from "../utils";

@suite
class ParameterSuite {
  @test
  async shouldHaveParameter() {
    const writerStub = await runTests("testData");
    expect(writerStub.groups.find((suite) => suite.name === "TestData")).not.eq(undefined);
    const test = writerStub.getTestByName("shouldCallTestUserDataOnTest");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findParameter(test, "inputs").value).eq(
      JSON.stringify({
        firstName: "Test",
        lastName: "User",
      }),
    );
  }
}
