import { suite, test } from "@testdeck/mocha";
import { getAllure } from "../../../runtime";

@suite
class Description {
  @test
  shouldAssignDescription() {
    const allure = getAllure();

    allure.description("Test description");
  }
}
