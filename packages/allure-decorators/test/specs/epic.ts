import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { findLabel, runTests } from "../utils";

@suite
class EpicSuite {
  @test
  async shouldHaveEpic() {
    const writerStub = await runTests("epic");
    expect(writerStub.groups.find((suite) => suite.name === "Epic")).not.eq(undefined);

    const test = writerStub.getTestByName("shouldAssignDecoratedEpic");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(findLabel(test, "epic").value).eq("Epic Name");
  }
}
