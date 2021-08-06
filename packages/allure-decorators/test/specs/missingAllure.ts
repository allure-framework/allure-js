import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findLabel, runTests } from "../utils";

@suite
class MissingAllureSuite {
  @test
  async shouldNotHandleDecoratorsWithoutAllure() {
    const writerStub = await runTests("missingAllure");
    expect(writerStub.groups.find((suite) => suite.name === "MissingAllure")).not.eq(undefined);

    const test = writerStub.getTestByName("shouldNotHandleEpicWithoutAllure");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "epic")).is.undefined;
  }
}
