import { suite, test } from "@testdeck/mocha";
import { getAllure } from "../../../runtime";

@suite
class Story {
  @test
  shouldAssignStory() {
    const allure = getAllure();

    allure.story("Common story");
  }
}
