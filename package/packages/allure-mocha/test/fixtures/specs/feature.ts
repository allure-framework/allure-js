import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Feature {
  @test
  shouldAssignFeature() {
    allure.feature("Login");
  }
}
