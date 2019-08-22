import { suite, test } from "mocha-typescript";
import { MochaAllureInterface } from "../../../src/MochaAllureInterface";

declare const allure: MochaAllureInterface;

@suite
class Feature {
  @test
  shouldAssignFeature() {
    allure.feature("Login");
  }
}
