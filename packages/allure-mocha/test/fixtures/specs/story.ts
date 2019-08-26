import { suite, test } from "mocha-typescript";
import { allure } from "../../../runtime";

@suite
class Story {
  @test
  shouldAssignStory() {
    allure.story("Common story");
  }
}
