import { suite, test } from "@testdeck/mocha";
import { InMemoryAllureWriter, Status } from "allure-js-commons";
import { expect } from "chai";
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
    const group = this.writerStub.getGroupByName("hooks test beforeEach fails");
    const [beforeHook] = group.befores;

    expect(test.status).eq(Status.BROKEN);
    expect(test.statusDetails.message).eq("In before each");
    expect(beforeHook).is.not.undefined;
    expect(beforeHook.status).eq(Status.BROKEN);
    expect(test.attachments).have.length(1);
    expect(test.attachments[0].name).eq("saved in beforeEach");
  }

  @test
  shouldHandleAfterEach() {
    const group = this.writerStub.getGroupByName("hooks test afterEach fails");
    const [afterHook] = group.afters;

    expect(afterHook).is.not.undefined;
    expect(afterHook.status).eq(Status.BROKEN);
    expect(afterHook.attachments).have.length(1);
    expect(afterHook.attachments[0].name).eq("saved in afterEach");
  }

  @test
  shouldPreserveTestErrorIfAfterEachFails() {
    const test = this.writerStub.getTestByName("failed test with afterEach");
    const group = this.writerStub.getGroupByName("hooks test both afterEach and test fail");
    const [afterHook] = group.afters;

    expect(test.status).eq(Status.FAILED);
    expect(test.statusDetails.message).eq("expected 1 to equal 2");
    expect(afterHook).is.not.undefined;
    expect(afterHook.status).eq(Status.BROKEN);
    expect(afterHook.attachments).have.length(1);
    expect(afterHook.attachments[0].name).eq("saved in afterEach");
  }

  @test
  shouldHandleBefore() {
    const test = this.writerStub.getTestByName('"before all" hook for "never runs"');

    expect(test.status).eq(Status.BROKEN);
    expect(test.statusDetails.message).eq("In before");
  }

  @test
  shouldHandleAfter() {
    const test = this.writerStub.getTestByName("fails in after");
    const group = this.writerStub.getGroupByName("hooks test after fails");
    const [afterHook] = group.afters;

    expect(test.status).eq(Status.PASSED);
    expect(afterHook).is.not.undefined;
    expect(afterHook.status).eq(Status.BROKEN);
  }

  @test
  shouldHandleBeforeEachName() {
    const group = this.writerStub.getGroupByName("hooks test named hooks");

    const [beforeHook] = group.befores;

    expect(beforeHook.name).eq("\"before each\" hook: some beforeEach name")
  }

  @test
  shouldHandleAfterEachName() {
    const group = this.writerStub.getGroupByName("hooks test named hooks");

    const [afterEach] = group.afters;

    expect(afterEach.name).eq("\"after each\" hook: some afterEach name")
  }
}
