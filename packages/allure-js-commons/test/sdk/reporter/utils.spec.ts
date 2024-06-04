import { describe, expect, it } from "vitest";
import { LabelName } from "../../../src/model.js";
import { getSuiteLabels, serialize, typeToExtension } from "../../../src/sdk/reporter/utils.js";

describe("typeToExtension", () => {
  it("should respect provided file extension", () => {
    const extension = typeToExtension({
      contentType: "application/json",
      fileExtension: ".txt",
    });

    expect(extension).toBe(".txt");
  });

  it("should respect provided file extension without leading dot", () => {
    const extension = typeToExtension({
      contentType: "application/json",
      fileExtension: "txt",
    });

    expect(extension).toBe(".txt");
  });

  it("should get extension for well-known content type", () => {
    const extension = typeToExtension({
      contentType: "application/json",
    });

    expect(extension).toBe(".json");
  });

  it("should get extension for allure imagediff", () => {
    const extension = typeToExtension({
      contentType: "application/vnd.allure.image.diff",
    });

    expect(extension).toBe(".imagediff");
  });

  it("should get an empty extension for unknown type", () => {
    const extension = typeToExtension({
      contentType: "application/vnd.unknown",
    });

    expect(extension).toBe("");
  });
});

describe("getSuiteLabels", () => {
  describe("with empty suites", () => {
    it("returns empty array", () => {
      expect(getSuiteLabels([])).toEqual([]);
    });
  });

  describe("with single suite", () => {
    it("returns parent suite label as the first element", () => {
      expect(getSuiteLabels(["foo"])).toEqual([
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
      ]);
    });
  });

  describe("with two suites", () => {
    it("returns parent suite and suite labels as the first two elements", () => {
      expect(getSuiteLabels(["foo", "bar"])).toEqual([
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
        {
          name: LabelName.SUITE,
          value: "bar",
        },
      ]);
    });
  });

  describe("with three or more suites", () => {
    it("returns list of three elements where last one is a sub suite label", () => {
      expect(getSuiteLabels(["foo", "bar", "baz", "beep", "boop"])).toEqual([
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
        {
          name: LabelName.SUITE,
          value: "bar",
        },
        {
          name: LabelName.SUB_SUITE,
          value: "baz > beep > boop",
        },
      ]);
    });
  });
});

describe("serialize", () => {
  describe("with object", () => {
    it("returns JSON string", () => {
      // eslint-disable-next-line @typescript-eslint/quotes
      expect(serialize({ foo: "bar" })).toBe('{"foo":"bar"}');
    });
  });

  describe("with array", () => {
    it("returns JSON string", () => {
      // eslint-disable-next-line @typescript-eslint/quotes
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
      // eslint-disable-next-line @typescript-eslint/quotes
      expect(serialize("foo")).toBe("foo");
      expect(serialize(123)).toBe("123");
      expect(serialize(true)).toBe("true");
    });
  });
});
