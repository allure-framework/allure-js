import { suite, test } from "@testdeck/mocha";
import { getAllure } from "../../../runtime";

@suite
class Owner {
  @test
  shouldAssignOwner() {
    const allure = getAllure();

    allure.owner("sskorol");
  }
}
