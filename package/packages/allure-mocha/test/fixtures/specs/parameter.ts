import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Parameter {
  @test
  shouldAssignParameter() {
    allure.parameter("key", "value");
  }
}
