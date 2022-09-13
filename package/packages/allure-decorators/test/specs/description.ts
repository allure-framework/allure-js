import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { runTests } from "../utils";

@suite
class DescriptionSuite {
  @test
  async shouldHaveDescription() {
    const writerStub = await runTests("description");
    expect(writerStub.groups.find((suite) => suite.name === "Description")).not.eq(undefined);

    let test = writerStub.getTestByName("shouldAssignDecoratedDescription");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(test.description).eq("Decorated description");

    test = writerStub.getTestByName("shouldAssignFunctionalDecoratedDescription");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(test.description).eq("Functional decorated description");
  }
}
