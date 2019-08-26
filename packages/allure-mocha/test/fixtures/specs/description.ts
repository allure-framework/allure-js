import { suite, test } from "mocha-typescript";
import { allure } from "../../../runtime";

@suite
class Description {
  @test
  shouldAssignDescription() {
    allure.description("Test description");
  }
}
