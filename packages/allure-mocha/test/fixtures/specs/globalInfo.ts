import { suite, test } from "@testdeck/mocha";
import { Allure, Status } from "allure-js-commons";
import { getAllure } from "../../../runtime";

@suite
class GlobalInfo {
  @test
  shouldWriteEnvironment() {
    const allure = getAllure();

    allure.writeEnvironmentInfo({
      Browser: "chrome",
      GitHub: "https://github.com/sskorol",
      Author: "Sergey Korol",
    });
  }

  @test
  shouldWriteCategories() {
    const allure = getAllure();

    allure.writeCategoriesDefinitions([
      {
        name: "Sad tests",
        messageRegex: /.*Sad.*/,
        matchedStatuses: [Status.FAILED],
      },
      {
        name: "Infrastructure problems",
        messageRegex: ".*Error.*",
        matchedStatuses: [Status.BROKEN],
      },
    ]);
  }
}
