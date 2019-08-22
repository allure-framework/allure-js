import { suite, test } from "mocha-typescript";
import { MochaAllureInterface } from "../../../src/MochaAllureInterface";

declare const allure: MochaAllureInterface;

@suite
class Description {
  @test
  shouldAssignDescription() {
    allure.description("Test description");
  }
}
