import { test, suite } from "@testdeck/mocha";
import { ContentType } from "allure-js-commons";
import { allure } from "../../../runtime";

@suite
class DecoratedHooks {
  @test
  shouldAddAfterHookAttachment() {
  }

  public after() {
    allure.attachment("test attachment 1", "test attachment 1 content", ContentType.TEXT);
  }
}
