import { beforeEach, describe, it } from "mocha";
import { allure } from "allure-mocha/runtime";

describe("a suite with before", () => {
  beforeEach("an initial name", () => {
    allure.displayName("a new name");
  });

  it("a test affected by a renamed fixture", () => {});
});
