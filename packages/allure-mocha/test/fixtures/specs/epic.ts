import { suite, test } from "@testdeck/mocha";
import { allure } from "../../../runtime";

@suite
class Epic {
  @test
  shouldAssignEpic() {
    allure.epic("epic name");
  }
}
