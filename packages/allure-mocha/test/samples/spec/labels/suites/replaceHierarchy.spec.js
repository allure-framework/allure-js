// cjs: const { beforeEach, describe, it } = require("mocha");
// cjs: const { bdd, feature, suites, suite } = require("allure-js-commons");
// esm: import { beforeEach, describe, it } from "mocha";
// esm: import { bdd, feature, suites, suite } from "allure-js-commons";

describe("Default parent", () => {
  describe("Default suite", () => {
    beforeEach(async () => {
      await suites("Hook parent", "Hook suite");
      await bdd("Hook feature");
    });

    it("inherits replacement", async () => {
      await suite("Ignored suite");
    });

    it("replaces the inherited hierarchy", async () => {
      await suites("Parent", "Suite", "Sub-suite");
      await suites("Final suite");
      await bdd("Epic", "Feature", "Story");
      await feature("Ignored feature");
    });
  });
});
