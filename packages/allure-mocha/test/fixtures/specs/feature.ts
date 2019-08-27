import { suite, test } from "mocha-typescript";
import { allure } from "../../../runtime";

@suite
class Feature {
  @test
  shouldAssignFeature() {
    allure.feature("Login");
  }
}
