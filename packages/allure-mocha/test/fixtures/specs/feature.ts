import { suite, test } from "@testdeck/mocha";
import { getAllure } from "../../../runtime";

@suite
class Feature {
  @test
  shouldAssignFeature() {
    const allure = getAllure();

    allure.feature("Login");
  }
}
