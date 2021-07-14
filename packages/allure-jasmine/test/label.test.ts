import { runTest } from "./helpers";

describe("Allure Result", () => {
  describe("for test with bdd labels in 'it'", () => {
    it("should have all defined bdd labels", async () => {
      const report = await runTest(testAllure => {
        describe("Example", () => {
          it("it with BDD Labels", () => {
            testAllure.epic("it Epic");
            testAllure.feature("it Feature");
            testAllure.story("it Story");
          });
        });
      });

      expect(report.tests).toContain(jasmine.objectContaining(
        {
          name: "it with BDD Labels",
          labels: jasmine.arrayContaining(
            [
              { name: "epic", value: "it Epic" },
              { name: "feature", value: "it Feature" },
              { name: "story", value: "it Story" }
            ]
          )
        }
      ));
    });
  });
});
