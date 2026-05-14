import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runJestInlineTest } from "../utils.js";

it("handles jest tests", async () => {
  const { tests } = await runJestInlineTest({
    "sample.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});

it("should set full name", async () => {
  const { tests } = await runJestInlineTest({
    "a/path/to/test/sample.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass",
        fullName: "allure-jest:a/path/to/test/sample.spec.js#should pass",
        status: Status.PASSED,
      }),
    ]),
  );
});

it("preserves async handleTestEvent from a custom environment", async () => {
  const { tests } = await runJestInlineTest({
    "jest.config.js": () => `
      const config = {
        bail: false,
        testEnvironment: "./custom-environment.js",
      };

      module.exports = config;
    `,
    "custom-environment.js": ({ allureJestFactoryPath }) => `
      const { TestEnvironment } = require("jest-environment-node");
      const { createJestEnvironment } = require("${allureJestFactoryPath}");

      class CustomEnvironment extends TestEnvironment {
        async handleTestEvent(event) {
          if (event.name === "test_fn_failure") {
            this.global.__failedTestNames = [...(this.global.__failedTestNames ?? []), event.test.name];
          }
        }
      }

      module.exports = createJestEnvironment(CustomEnvironment);
    `,
    "sample.spec.js": `
      it("fails", () => {
        throw new Error("boom");
      });

      it("observes the custom environment event", () => {
        expect(global.__failedTestNames).toEqual(["fails"]);
      });
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "fails",
        status: Status.BROKEN,
      }),
      expect.objectContaining({
        name: "observes the custom environment event",
        status: Status.PASSED,
      }),
    ]),
  );
});

it("preserves sync handleTestEvent from a custom environment", async () => {
  const { tests } = await runJestInlineTest({
    "jest.config.js": () => `
      const config = {
        bail: false,
        testEnvironment: "./custom-environment.js",
      };

      module.exports = config;
    `,
    "custom-environment.js": ({ allureJestFactoryPath }) => `
      const { TestEnvironment } = require("jest-environment-node");
      const { createJestEnvironment } = require("${allureJestFactoryPath}");

      class CustomEnvironment extends TestEnvironment {
        handleTestEvent(event) {
          if (event.name === "test_start") {
            this.global.__startedTestNames = [...(this.global.__startedTestNames ?? []), event.test.name];
          }
        }
      }

      module.exports = createJestEnvironment(CustomEnvironment);
    `,
    "sample.spec.js": `
      it("runs first", () => {
        expect(global.__startedTestNames).toEqual(["runs first"]);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "runs first",
        status: Status.PASSED,
      }),
    ]),
  );
});
