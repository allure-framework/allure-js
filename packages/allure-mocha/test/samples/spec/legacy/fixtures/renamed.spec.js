// cjs: const { beforeEach, describe, it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { beforeEach, describe, it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

describe("a suite with before", () => {
  beforeEach("an initial name", () => {
    allure.displayName("a new name");
  });

  it("a test affected by a renamed fixture", () => {});
});
