import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findLabel, runTests } from "../utils";

@suite
class OwnerSuite {
  @test
  async shouldHaveOwner() {
    const writerStub = await runTests("owner");
    expect(writerStub.groups.find((suite) => suite.name === "Owner")).not.eq(undefined);
    const test = writerStub.getTestByName("shouldAssignDecoratedOwner");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "owner").value).eq("Sergey Korol");
  }
}
