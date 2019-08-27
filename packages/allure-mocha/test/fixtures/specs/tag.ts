import { suite, test } from "mocha-typescript";
import { allure } from "../../../runtime";

@suite
class Tag {
  @test
  shouldAssignTag() {
    allure.tag("smoke");
  }
}
