import { Allure } from "allure-js-commons";
import { matchers } from "./matchers";
import { runTest } from "./helpers";
import { allure } from "./setup";

describe("Allure Result", () => {
  beforeAll(() => jasmine.addMatchers(matchers));

  describe("for test with bdd labels in 'it'", function() {
    const example = (tetEnv: any, testAllure: Allure) => {
      tetEnv.describe("Jasmine example", () => {
        tetEnv.it("passed test", () => {
          testAllure.epic("epic from it");
          testAllure.feature("feature from it");
          testAllure.story("story from it");
          tetEnv.expect(true).toBeTruthy();
        });
      });
    };

    it("should has all defined bdd labels", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({
        labels: [
          { name: "epic", value: "epic from it" },
          { name: "feature", value: "feature from it" },
          { name: "story", value: "story from it" }
        ]
      });
    });
  });

  describe("for test with bdd labels in 'describe'", function() {
    beforeAll(() => {
      allure.epic("epic from describe");
      allure.feature("feature from describe");
      allure.story("story from describe");
    });

    const example = (tetEnv: any, testAllure: Allure) => {
      tetEnv.describe("Jasmine example", () => {
        tetEnv.beforeAll(() => {
          testAllure.epic("epic from describe");
          testAllure.feature("feature from describe");
          testAllure.story("story from describe");
        });

        tetEnv.it("passed test", () => {
          tetEnv.expect(true).toBeTruthy();
        });
      });
    };

    it("should has all defined bdd labels", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({
        labels: [
          { name: "epic", value: "epic from describe" },
          { name: "feature", value: "feature from describe" },
          { name: "story", value: "story from describe" }
        ]
      });
    });
  });
});
