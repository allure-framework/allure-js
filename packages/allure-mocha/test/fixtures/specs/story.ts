import { suite, test } from "mocha-typescript";
import { MochaAllureInterface } from "../../../src/MochaAllureInterface";

declare const allure: MochaAllureInterface;

@suite
class Story {
  @test
  shouldAssignStory() {
    allure.story("Common story");
  }
}
