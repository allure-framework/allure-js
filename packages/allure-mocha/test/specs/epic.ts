import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findLabelValue, runTests } from "../utils";

@suite
class EpicSuite {
  @test
  async shouldHaveEpic() {
    const writerStub = await runTests("epic");
    const test = writerStub.getTestByName("shouldAssignEpic");

    expect(test.status).eq(Status.PASSED);
    expect(findLabelValue(test, "epic")).eq("epic name");
  }
}
