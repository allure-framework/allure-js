import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Story {
  @test
  shouldAssignStory() {
    allure.story("Common story");
  }
}
