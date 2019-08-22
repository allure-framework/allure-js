import { suite, test } from "mocha-typescript";
import { MochaAllureInterface } from "../../../src/MochaAllureInterface";

declare const allure: MochaAllureInterface;

@suite
class Parameter {
  @test
  shouldAssignParameter() {
    allure.parameter("key", "value");
  }
}
