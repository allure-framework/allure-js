import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Tag {
  @test
  shouldAssignTag() {
    allure.tag("smoke");
  }
}
