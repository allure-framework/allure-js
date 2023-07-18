import { suite, test } from "@testdeck/mocha";
import { getAllure } from "../../../runtime";

@suite
class Epic {
  @test
  shouldAssignEpic() {
    const allure = getAllure();

    allure.epic("epic name");
  }
}
