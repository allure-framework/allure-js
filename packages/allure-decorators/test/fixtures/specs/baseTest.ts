import { MochaAllure, allureGetter } from "allure-mocha/runtime";
import { decorate } from "../../../";

export class BaseTest {
  public static readonly TEST_URL = "https://custom.domain.com";

  public before() {
    const allure = allureGetter();

    decorate<MochaAllure>(allure);
  }
}
