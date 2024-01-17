import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { Status } from "allure-js-commons";
import { runTests } from "../utils";

@suite
class AttachmentsSuite {
  @test
  async shouldHaveAttachments() {
    const writerStub = await runTests("attachment");

    expect(writerStub.groups.find((test) => test.name === "AttachmentSubSuite")).not.eq(undefined);

    const test = writerStub.getTestByName("shouldAssignAttachments");
    expect(test).not.eq(undefined);
    expect(test.status).eq(Status.PASSED);

    expect(test.attachments).length(3);
    expect(test.attachments[0].name).eq("test attachment 1");
    expect(test.attachments[0].type).eq("text/plain");
    expect(test.attachments[1].name).eq("test attachment 2");
    expect(test.attachments[1].type).eq("application/json");
    expect(test.attachments[2].name).eq("custom-attachment");
    expect(test.attachments[2].type).eq("application/vnd.something.custom");
    expect(test.attachments[2].source).matches(/\.json$/);

    expect(test.steps).length(2);

    expect(test.steps[0].attachments).length(2);
    expect(test.steps[0].attachments[0].name).eq("step 1 attachment 1");
    expect(test.steps[0].attachments[0].type).eq("text/plain");
    expect(test.steps[0].attachments[1].name).eq("step 1 attachment 2");
    expect(test.steps[0].attachments[1].type).eq("text/plain");

    expect(test.steps[1].attachments).length(2);
    expect(test.steps[1].attachments[0].name).eq("step 2 attachment 1");
    expect(test.steps[1].attachments[0].type).eq("text/plain");
    expect(test.steps[1].attachments[1].name).eq("step 2 attachment 2");
    expect(test.steps[1].attachments[1].type).eq("text/plain");
  }
}
