import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Description {
  @test
  shouldAssignDescription() {
    allure.description("Test description");
  }
}
