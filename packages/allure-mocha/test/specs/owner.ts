import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { findLabel, runTests } from "../utils";

@suite
class OwnerSuite {
  @test
  async shouldHaveOwner() {
    const writerStub = await runTests("owner");
    const test = writerStub.getTestByName("shouldAssignOwner");

    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "owner")!.value).eq("sskorol");
  }
}
