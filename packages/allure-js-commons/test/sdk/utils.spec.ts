import assert from "node:assert";
import { describe, expect, it } from "vitest";
import { LabelName, Status } from "../../src/model.js";
import type { FixtureResult, StepResult, TestResult } from "../../src/model.js";
import { allureLabelRegexp, getStatusFromError, isAnyStepFailed } from "../../src/sdk/utils.js";

type Executable = StepResult | TestResult | FixtureResult;

const fixtures = {
  withoutFailed: {
    status: Status.PASSED,
    steps: [
      {
        status: Status.PASSED,
        steps: [
          {
            status: Status.PASSED,
            steps: [],
          },
        ],
      },
    ],
  },
  withFailedRoot: {
    status: Status.FAILED,
    steps: [
      {
        status: Status.PASSED,
        steps: [
          {
            status: Status.PASSED,
            steps: [],
          },
        ],
      },
    ],
  },
  withFailedNested: {
    status: Status.PASSED,
    steps: [
      {
        status: Status.PASSED,
        steps: [
          {
            status: Status.FAILED,
            steps: [],
          },
        ],
      },
    ],
  },
};

describe("isAnyStepFailed", () => {
  describe("without any failed step", () => {
    it("returns false", () => {
      // eslint-disable-next-line
      // @ts-ignore
      expect(isAnyStepFailed(fixtures.withoutFailed as Executable)).toBe(false);
    });
  });

  describe("with failed root item", () => {
    it("returns true", () => {
      // eslint-disable-next-line
      // @ts-ignore
      expect(isAnyStepFailed(fixtures.withFailedRoot as Executable)).toBe(true);
    });
  });

  describe("with failed nested step", () => {
    it("returns true", () => {
      // eslint-disable-next-line
      // @ts-ignore
      expect(isAnyStepFailed(fixtures.withFailedNested as Executable)).toBe(true);
    });
  });
});

describe("allureLabelRegexp", () => {
  describe("with non scoped tag", () => {
    it("return FOO", () => {
      // eslint-disable-next-line
      // @ts-ignore
      const labelMatch = "@allure.label.tag=FOO".match(allureLabelRegexp);
      const { name, value } = labelMatch?.groups || {};
      expect(name).toBe(LabelName.TAG);
      expect(value).toBe("FOO");
    });
  });
  describe("with a scoped tag", () => {
    it("return FOO:123", () => {
      // eslint-disable-next-line
      // @ts-ignore
      const labelMatch = "@allure.label.tag=FOO:123".match(allureLabelRegexp);
      const { name, value } = labelMatch?.groups || {};
      expect(name).toBe(LabelName.TAG);
      expect(value).toBe("FOO:123");
    });

    it("return FOO:123", () => {
      // eslint-disable-next-line
      // @ts-ignore
      const labelMatch = "@allure.label.tag:FOO:123".match(allureLabelRegexp);
      const { name, value } = labelMatch?.groups || {};
      expect(name).toBe(LabelName.TAG);
      expect(value).toBe("FOO:123");
    });
  });
});

describe("getStatusFromError", () => {
  describe("with node assert error", () => {
    it("returns failed", () => {
      try {
        assert(false, "test");
      } catch (err) {
        expect(getStatusFromError(err as Error)).toBe(Status.FAILED);
      }
    });
  });

  describe("with chai assertion error", () => {
    it("returns failed", () => {
      try {
        expect(false).toBe(true);
      } catch (err) {
        expect(getStatusFromError(err as Error)).toBe(Status.FAILED);
      }
    });
  });

  describe("with jest assertion error", () => {
    it("returns failed", () => {
      try {
        expect(false).toBe(true);
      } catch (err) {
        expect(getStatusFromError(err as Error)).toBe(Status.FAILED);
      }
    });
  });

  describe("with any error name contains 'assert' word", () => {
    it("returns failed", () => {
      try {
        const err = new Error("error");

        err.name = "CustomAssertError";

        throw err;
      } catch (err) {
        expect(getStatusFromError(err as Error)).toBe(Status.FAILED);
      }
    });
  });

  describe("with any error message contains 'assert' word", () => {
    it("returns failed", () => {
      try {
        throw new Error("assertion error");
      } catch (err) {
        expect(getStatusFromError(err as Error)).toBe(Status.FAILED);
      }
    });
  });

  describe("with any not-assertion error", () => {
    it("returns broken", () => {
      try {
        throw new Error("an error");
      } catch (err) {
        expect(getStatusFromError(err as Error)).toBe(Status.BROKEN);
      }
    });
  });
});
