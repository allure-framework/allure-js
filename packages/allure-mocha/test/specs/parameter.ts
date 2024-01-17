import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { findParameter, runTests } from "../utils";

@suite
class ParameterSuite {
  @test
  async shouldHaveParameter() {
    const writerStub = await runTests("parameter");
    const test = writerStub.getTestByName("shouldAssignParameter");

    expect(test.status).eq(Status.PASSED);
    expect(findParameter(test, "key").value).eq("value");
  }
}
