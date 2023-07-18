import { suite, test } from "@testdeck/mocha";
import { getAllure } from "../../../runtime";

@suite
class Tag {
  @test
  shouldAssignTag() {
    const allure = getAllure();

    allure.tag("smoke");
  }
}
