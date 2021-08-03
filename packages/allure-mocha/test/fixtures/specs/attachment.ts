import { suite, test } from "@testdeck/mocha";
import { ContentType } from "allure-js-commons";
import { allure } from "../../../runtime";

@suite
class AttachmentSubSuite {
  @test
  shouldAssignAttachments() {
    allure.testAttachment("test attachment 1", "test attachment 1 content", ContentType.TEXT);
    allure.step("step 1", () => {
      allure.attachment("step 1 attachment 1", "step 1 attachment 1 content", ContentType.TEXT);
      allure.attachment("step 1 attachment 2", "step 1 attachment 2 content", ContentType.TEXT);
    });
    allure.step("step 2", () => {
      allure.attachment("step 2 attachment 1", "step 2 attachment 1 content", ContentType.TEXT);
      allure.attachment("step 2 attachment 2", "step 2 attachment 2 content", ContentType.TEXT);
    });
    allure.testAttachment("test attachment 2", "{ \"key\": \"value\" }", ContentType.JSON);
    allure.testAttachment("custom-attachment", "{}", {
      contentType: "application/vnd.something.custom",
      fileExtension: "json",
    });
  }
}
