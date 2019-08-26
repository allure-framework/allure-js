import { suite, test } from "mocha-typescript";
import { allure } from "../../../runtime";

@suite
class Parameter {
  @test
  shouldAssignParameter() {
    allure.parameter("key", "value");
  }
}
