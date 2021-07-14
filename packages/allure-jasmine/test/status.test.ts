import { runTest } from "./helpers";
import { Status } from "allure-js-commons";

describe("Allure Result", () => {
  describe("for passed test", () => {
    it("should have passed status", async () => {
      const report = await runTest(() => {
        describe("Example", () => {
          it("passed test", () => {
            expect(true).toBeTrue();
          });
        });
      });

      expect(report.tests).toContain(jasmine.objectContaining(
        {
          name: "passed test",
          status: Status.PASSED
        }
      ));
    });
  });

  describe("for test with assertion", () => {
    it("should have failed status", async () => {
      const report = await runTest(() => {
        describe("Example", () => {
          it("failed test", () => {
            expect(false).toBeTrue();
          });
        });
      });

      expect(report.tests).toContain(jasmine.objectContaining(
        {
          name: "failed test",
          status: Status.FAILED,
          statusDetails: jasmine.objectContaining({
            message: "[1] - Expected false to be true.",
            trace: jasmine.stringMatching(/^\[1\] - Error: Expected false to be true./)
          })
        }
      ));
    });
  });

  xdescribe("for test with error", () => {
    it("should have broken status", async () => {
      const report = await runTest(() => {
        describe("Example", () => {
          it("broken test", () => {
            throw new Error("Error in test");
          });
        });
      });
    });
  });

  describe("for test with 'xit'", () => {
    it("should have skipped status", async () => {
      const report = await runTest(() => {
        describe("Example", () => {
          xit("skipped test", () => {
          });
        });
      });

      expect(report.tests).toContain(jasmine.objectContaining(
        {
          name: "skipped test",
          status: Status.SKIPPED,
          statusDetails: jasmine.objectContaining({
            message: "Temporarily disabled with xit"
          })
        }
      ));
    });
  });
});
