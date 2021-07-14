import { runTest } from "./helpers";

describe("Allure Result", () => {
  describe("for test with beforeEach fixture", () => {
    fit("should have before fixture for all it's", async () => {
      const report = await runTest(testAllure => {
        describe("Example", () => {
          describe("qwe", () => {
            afterEach(() => {
              expect(false).toBeNull();
              //throw new Error("qw")
            });
            it("it with BDD Labels", () => {
            });
          });
        });
      });
      console.log(">>", report.tests[0]);
      console.log(">>", report.groups[0]);
    });
  });
});
