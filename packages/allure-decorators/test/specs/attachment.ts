import { Status } from "allure-js-commons";
import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";
import { runTests } from "../utils";

@suite
class AttachmentSuite {
  @test
  async shouldHaveAttachment() {
    const writerStub = await runTests("attachment");
    expect(writerStub.groups.find((suite) => suite.name === "Attachment")).not.eq(undefined);
    let test = writerStub.getTestByName("shouldAssignDecoratedAttachment");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(test.attachments.length).eq(1);
    expect(test.attachments[0].name).eq("Test attachment");
    expect(test.attachments[0].type).eq("text/plain");
    expect(test.steps.length).eq(1);
    expect(test.steps[0].attachments.length).eq(1);
    expect(test.steps[0].attachments[0].name).eq("Step attachment");
    expect(test.steps[0].attachments[0].type).eq("text/plain");

    test = writerStub.getTestByName("shouldNotProcessBrokenAttachment");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);
    expect(test.attachments.length).eq(0);
  }
}
