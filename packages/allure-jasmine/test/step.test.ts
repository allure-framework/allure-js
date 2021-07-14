import { runTest } from "./helpers";
import { Status, StepWrapper } from "allure-js-commons";


describe("Allure result", () => {
  describe("for test with nested passed step", () => {
    it("should contain nested passed steps", async() => {
      const report = await runTest(testAllure => {
        describe("Example", () => {
          it("it with nested passed steps", () => {
            const value = testAllure.step("parent step example", () => {
              return testAllure.step("child step example", () => {
                return true;
              });
            });
            expect(value).toBeTrue();
          });
        });
      });

      expect(report.tests).toContain(jasmine.objectContaining(
        {
          name: "it with nested passed steps",
          status: Status.PASSED,
          steps: jasmine.arrayContaining(
            [
              jasmine.objectContaining({
                name: "parent step example",
                status: Status.PASSED,
                steps: jasmine.arrayContaining([
                  jasmine.objectContaining({
                    name: "child step example",
                    status: Status.PASSED,
                  })
                ])
              })
            ]
          )
        }
      ));
    });
  });

  describe("for test with nested failed step", () => {
    it("should contain nested failed steps", async() => {
      const report = await runTest(testAllure => {
        describe("Example", () => {
          it("it with nested failed steps", () => {
            testAllure.step("parent step example", () => {
              testAllure.step("child step example", () => {
                expect(false).toBeTrue();
              });
            });
          });
        });
      });

      expect(report.tests).toContain(jasmine.objectContaining(
        {
          name: "it with nested failed steps",
          status: Status.FAILED,
          steps: jasmine.arrayContaining(
            [
              jasmine.objectContaining({
                name: "parent step example",
                status: Status.FAILED,
                steps: jasmine.arrayContaining([
                  jasmine.objectContaining({
                    name: "child step example",
                    status: Status.FAILED,
                  })
                ])
              })
            ]
          )
        }
      ));
    });
  });

  describe("for test with nested step", () => {
    it("should contain right status details", async() => {
      const report = await runTest(testAllure => {
        describe("Example", () => {
          it("it with nested steps", () => {
            testAllure.step("failed parent step example", () => {
              expect(undefined).toBeDefined();
              testAllure.step("passed child step example", () => {
                expect(true).toBeTrue();
              });
              testAllure.step("failed child step example", () => {
                expect(false).toBeTrue();
                expect(null).not.toBeNull();
              });
              expect(-1).toBeGreaterThan(1);
            });
          });
        });
      });

      expect(report.tests).toContain(jasmine.objectContaining(
        {
          name: "it with nested steps",
          status: Status.FAILED,
          steps: jasmine.arrayContaining(
            [
              jasmine.objectContaining({
                name: "failed parent step example",
                status: Status.FAILED,
                steps: jasmine.arrayContaining([
                  jasmine.objectContaining({
                    name: "passed child step example",
                    status: Status.PASSED,
                  }),
                  jasmine.objectContaining({
                    name: "failed child step example",
                    status: Status.FAILED,
                    statusDetails: jasmine.objectContaining({
                      message: jasmine.stringMatching(/\[2\] - Expected false to be true./)
                    })
                  }),
                  jasmine.objectContaining({
                    name: "failed child step example",
                    statusDetails: jasmine.objectContaining({
                      message: jasmine.stringMatching(/\[3\] - Expected null not to be null./)
                    })
                  })
                ])
              }),
              jasmine.objectContaining({
                name: "failed parent step example",
                statusDetails: jasmine.objectContaining({
                  message: jasmine.stringMatching(/\[1\] - Expected undefined to be defined./)
                })
              }),
              jasmine.objectContaining({
                name: "failed parent step example",
                statusDetails: jasmine.objectContaining({
                  message: jasmine.stringMatching(/\[2\] - Expected false to be true./)
                })
              }),
              jasmine.objectContaining({
                name: "failed parent step example",
                statusDetails: jasmine.objectContaining({
                  message: jasmine.stringMatching(/\[3\] - Expected null not to be null./)
                })
              }),
              jasmine.objectContaining({
                name: "failed parent step example",
                statusDetails: jasmine.objectContaining({
                  message: jasmine.stringMatching(/\[4\] - Expected -1 to be greater than 1./)
                })
              })
            ]
          )
        }
      ));
    });
  });
});
