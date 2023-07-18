import { suite, test } from "@testdeck/mocha";
import { getAllure } from "../../../runtime";

@suite
class Parameter {
  @test
  shouldAssignParameter() {
    const allure = getAllure();

    allure.parameter("key", "value");
  }
}
