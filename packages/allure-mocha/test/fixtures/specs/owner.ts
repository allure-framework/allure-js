import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Owner {
  @test
  shouldAssignOwner() {
    allure.owner("sskorol");
  }
}
