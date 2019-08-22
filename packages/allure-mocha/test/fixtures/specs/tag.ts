import { suite, test } from "mocha-typescript";
import { MochaAllureInterface } from "../../../src/MochaAllureInterface";

declare const allure: MochaAllureInterface;

@suite
class Tag {
  @test
  shouldAssignTag() {
    allure.tag("smoke");
  }
}
