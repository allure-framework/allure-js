import fs from "fs";
import process from "process";
import { expect } from "chai";
import { restore, SinonStub, stub } from "sinon";
import { createTestPlanFilter } from "../../src/CucumberJSAllureFilter";

const fixtures = {
  config: {
    parallel: 2,
  },
};

describe("CucumberJSAllureFilter", () => {
  afterEach(() => {
    process.env.ALLURE_TESTPLAN_PATH = undefined;
    restore();
  });

  describe("createTestplanFilter", () => {
    describe("without ALLURE_TESTPLAN_PATH", () => {
      beforeEach(() => {
        process.env.ALLURE_TESTPLAN_PATH = undefined;
      });

      it("returns the same configuration", () => {
        const result = createTestPlanFilter(fixtures.config);

        expect(result).eq(fixtures.config);
      });
    });

    describe("with ALLURE_TESTPLAN_PATH", () => {
      describe("`testplan.json` doesn't exist", () => {
        beforeEach(() => {
          process.env.ALLURE_TESTPLAN_PATH = "foo/bar/baz/testplan.json";
          stub(fs, "readFileSync").withArgs("foo/bar/baz/testplan.json").throws(new Error("ENOENT"));
        });

        it("returns the same configuration", () => {
          const result = createTestPlanFilter(fixtures.config);

          expect(result).eq(fixtures.config);
        });
      });

      describe("`testplan.json` exists", () => {
        beforeEach(() => {
          process.env.ALLURE_TESTPLAN_PATH = "foo/bar/baz/testplan.json";
          stub(fs, "readFileSync").withArgs("foo/bar/baz/testplan.json").returns(JSON.stringify({
              version: "1.0.0",
              tests: [
                {
                  id: "1",
                  selector: "test/specs/one.ts",
                },
              ],
          }));
        });

        it("modifies configuration by selectors from `testplan.json`", () => {
          const result = createTestPlanFilter(fixtures.config);

          expect(result).to.eql({
            ...fixtures.config,
            paths: ["test/specs/one.ts"],
          });
        });
      });
    });
  });
});
