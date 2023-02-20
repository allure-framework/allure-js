import fs from "node:fs";
import MochaAllureReporter from "allure-mocha";
import { expect } from "chai";
import Mocha, { beforeEach, describe, it } from "mocha";
import { restore, stub } from "sinon";

describe("reporter", () => {
  beforeEach(() => {
    restore();
    stub(fs, "mkdirSync").callsFake(() => "");
  });

  describe("single thread mode", () => {
    it("doesn't throw any error", (done) => {
      const mocha = new Mocha({
        timeout: 16000,
        reporter: MochaAllureReporter,
        reporterOptions: {
          reporterEnabled: "list, ../allure-mocha",
          allureMochaReporterOptions: {
            resultsDir: ".",
          },
        },
      });

      mocha.run(() => {
        done();
      });
    });
  });

  describe("parallel mode", () => {
    it("throws an error", () => {
      const mocha = new Mocha({
        timeout: 16000,
        reporter: MochaAllureReporter,
        parallel: true,
        reporterOptions: {
          reporterEnabled: "list, ../allure-mocha",
          allureMochaReporterOptions: {
            resultsDir: "",
          },
        },
      });

      try {
        mocha.run();
      } catch (err) {
        expect((err as Error).message).eq(
          "Allure API doesn't work in parallel mode! If you want to use the functionality, please switch back to single thread mode!",
        );
      }
    });
  });
});
