import { InMemoryAllureWriter, Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { runTests } from "../utils";

@suite
class DecoratedHooks {
  private writerStub!: InMemoryAllureWriter;

  async before() {
    this.writerStub = await runTests("decoratedHooks");
  }

  @test
  shouldHandleAfterEachDecoratedHook() {
    const test = this.writerStub.getTestByName("shouldAddAfterHookAttachment");
    const group = this.writerStub.getGroupByName("DecoratedHooks");
    const [afterHook] = group.afters;

    expect(test.status).eq(Status.PASSED);
    expect(afterHook).is.not.undefined;
    expect(afterHook.attachments).have.length(1);
    expect(afterHook.attachments[0].name).eq("test attachment 1");
  }
}
