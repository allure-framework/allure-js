import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { findLabelValue, runTests } from "../utils";

@suite
class OwnerSuite {
  @test
  async shouldHaveOwner() {
    const writerStub = await runTests("owner");
    const test = writerStub.getTestByName("shouldAssignOwner");

    expect(test.status).eq(Status.PASSED);
    expect(findLabelValue(test, "owner")).eq("sskorol");
  }
}
