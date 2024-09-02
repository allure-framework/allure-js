import assert from "node:assert";
import { describe, expect, it } from "vitest";
import { LabelName, Status } from "../../src/model.js";
import type { FixtureResult, StepResult, TestResult } from "../../src/model.js";
import {
  allureLabelRegexp,
  extractMetadataFromString,
  getStatusFromError,
  isAnyStepFailed,
  isMetadataTag,
  serialize,
} from "../../src/sdk/utils.js";

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

describe("extractMetadataFromString", () => {
  it("should preserve the title if no matches", () => {
    expect(extractMetadataFromString("")).toEqual({
      cleanTitle: "",
      labels: [],
    });
    expect(extractMetadataFromString("foo")).toEqual({
      cleanTitle: "foo",
      labels: [],
    });
  });

  it("should extract Allure ID", () => {
    expect(extractMetadataFromString("foo @allure.id:1004")).toEqual({
      cleanTitle: "foo",
      labels: [{ name: "ALLURE_ID", value: "1004" }],
    });
    expect(extractMetadataFromString("foo allure.id:1004")).toEqual({
      cleanTitle: "foo",
      labels: [{ name: "ALLURE_ID", value: "1004" }],
    });
    expect(extractMetadataFromString("foo @allure.id=1004")).toEqual({
      cleanTitle: "foo",
      labels: [{ name: "ALLURE_ID", value: "1004" }],
    });
  });

  it("should extract label", () => {
    expect(extractMetadataFromString("foo @allure.label.bar:baz")).toEqual({
      cleanTitle: "foo",
      labels: [{ name: "bar", value: "baz" }],
    });
    expect(extractMetadataFromString("foo allure.label.bar:baz")).toEqual({
      cleanTitle: "foo",
      labels: [{ name: "bar", value: "baz" }],
    });
    expect(extractMetadataFromString("foo @allure.label.bar=baz")).toEqual({
      cleanTitle: "foo",
      labels: [{ name: "bar", value: "baz" }],
    });
  });

  it("should extract all matches", () => {
    expect(extractMetadataFromString("foo @allure.label.bar:baz @allure.id:1004 @allure.label.qux:quz")).toEqual({
      cleanTitle: "foo",
      labels: [
        { name: "bar", value: "baz" },
        { name: "ALLURE_ID", value: "1004" },
        { name: "qux", value: "quz" },
      ],
    });
  });

  it("should support multiline names", () => {
    expect(extractMetadataFromString("foo @allure.label.l1=v1\nbar @allure.id:1004 @allure.label.l2:v2 baz")).toEqual({
      cleanTitle: "foo\nbar baz",
      labels: [
        { name: "l1", value: "v1" },
        { name: "ALLURE_ID", value: "1004" },
        { name: "l2", value: "v2" },
      ],
    });
  });
});

describe("isMetadataTag", () => {
  it("should not match empty tag", () => {
    expect(isMetadataTag("")).toBeFalsy();
  });
  it("should not match regular tag", () => {
    expect(isMetadataTag("regular")).toBeFalsy();
  });
  it("should not match multi word tag", () => {
    expect(isMetadataTag("some multi word tag")).toBeFalsy();
  });
  it("should match allure.id tag", () => {
    expect(isMetadataTag("allure.id=123")).toBeTruthy();
  });
  it("should match allure.label tag", () => {
    expect(isMetadataTag("allure.label.x=y")).toBeTruthy();
  });
  it("should match @allure.label tag", () => {
    expect(isMetadataTag("@allure.label.x=y")).toBeTruthy();
  });
});

describe("serialize", () => {
  describe("with object", () => {
    it("returns JSON string", () => {
      // eslint-disable-next-line @stylistic/quotes
      expect(serialize({ foo: "bar" })).toBe('{"foo":"bar"}');
    });
  });

  describe("with array", () => {
    it("returns JSON string", () => {
      // eslint-disable-next-line @stylistic/quotes
      expect(serialize(["foo", "bar"])).toBe('["foo","bar"]');
    });
  });

  describe("with map", () => {
    it("returns JSON string", () => {
      expect(serialize(new Map([["foo", "bar"]]))).toBe("[object Map]");
    });
  });

  describe("with set", () => {
    it("returns JSON string", () => {
      expect(serialize(new Set(["foo", "bar"]))).toBe("[object Set]");
    });
  });

  describe("with undefined", () => {
    it("returns undefined string", () => {
      expect(serialize(undefined)).toBe("undefined");
    });
  });

  describe("with null", () => {
    it("returns null string", () => {
      expect(serialize(null)).toBe("null");
    });
  });

  describe("with function", () => {
    it("returns function string", () => {
      expect(serialize(() => {})).toBe("() => {\n      }");
    });
  });

  describe("with primitives", () => {
    it("returns stringified value", () => {
      // eslint-disable-next-line @stylistic/quotes
      expect(serialize("foo")).toBe("foo");
      expect(serialize(123)).toBe("123");
      expect(serialize(true)).toBe("true");
    });
  });
});
