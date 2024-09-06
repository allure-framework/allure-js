import { describe, expect, it } from "vitest";
import { LabelName } from "../../../src/model.js";
import { getSuiteLabels } from "../../../src/sdk/reporter/utils.js";

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
