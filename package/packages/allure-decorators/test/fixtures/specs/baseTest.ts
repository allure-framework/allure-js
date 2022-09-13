import { decorate } from "../../../";
import { allure, MochaAllure } from "allure-mocha/runtime";

export class BaseTest {
  public static readonly TEST_URL = "https://custom.domain.com";

  public before() {
    decorate<MochaAllure>(allure);
  }
}
