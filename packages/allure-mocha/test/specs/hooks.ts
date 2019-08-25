import { InMemoryAllureWriter, Status } from "allure-js-commons";
import { expect } from "chai";
import { suite } from "mocha-typescript";
import { runTests } from "../utils";

@suite
class HooksSuite {
  private writerStub!: InMemoryAllureWriter;

  async before() {
    this.writerStub = await runTests("hooks");
  }

  @test
  shouldHandleBeforeEach() {
    const test = this.writerStub.getTestByName("test with beforeEach");

    expect(test.status).eq(Status.BROKEN);
    expect(test.statusDetails.message).eq("In before each");
    expect(test.attachments).have.length(1);
    expect(test.attachments[0].name).eq("saved in beforeEach");
  }

  @test
  shouldHandleAfterEach() {
    const test = this.writerStub.getTestByName("passed test with afterEach");

    expect(test.status).eq(Status.BROKEN);
    expect(test.statusDetails.message).eq("In after each");
    expect(test.attachments).have.length(1);
    expect(test.attachments[0].name).eq("saved in afterEach");
  }

  @test
  shouldPreserveTestErrorIfAfterEachFails() {
    const test = this.writerStub.getTestByName("failed test with afterEach");

    expect(test.status).eq(Status.FAILED);
    expect(test.statusDetails.message).eq("expected 1 to equal 2");
    expect(test.attachments).have.length(1);
    expect(test.attachments[0].name).eq("saved in afterEach");
  }

  @test
  shouldHandleBefore() {
    const test = this.writerStub.getTestByName("\"before all\" hook for \"never runs\"");

    expect(test.status).eq(Status.BROKEN);
    expect(test.statusDetails.message).eq("In before");
  }

  @test
  shouldHandleAfter() {
    const test = this.writerStub.getTestByName("fails in after");

    expect(test.status).eq(Status.BROKEN);
    expect(test.statusDetails.message).eq("In after");
  }
}
