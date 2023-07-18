import { suite, test } from "@testdeck/mocha";
import { ContentType } from "allure-js-commons";
import { getAllure } from "../../../runtime";

@suite
class DecoratedHooks {
  @test
  shouldAddAfterHookAttachment() {}

  public after() {
    const allure = getAllure();

    allure.attachment("test attachment 1", "test attachment 1 content", ContentType.TEXT);
  }
}
