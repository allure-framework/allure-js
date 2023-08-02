import { decorate } from "../../../";
import { allureGetter, MochaAllure } from "allure-mocha/runtime";

export class BaseTest {
  public static readonly TEST_URL = "https://custom.domain.com";

  public before() {
    const allure = allureGetter();

    decorate<MochaAllure>(allure);
  }
}
