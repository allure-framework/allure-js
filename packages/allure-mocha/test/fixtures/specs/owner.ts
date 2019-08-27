import { suite, test } from "mocha-typescript";
import { allure } from "../../../runtime";

@suite
class Owner {
  @test
  shouldAssignOwner() {
    allure.owner("sskorol");
  }
}
