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
  describe("called with a primitive", () => {
    describe("undefined", () => {
      it("should return the 'undefined' constant", () => {
        expect(serialize(undefined)).toBe("undefined");
      });
    });

    describe("null", () => {
      it("should return the 'null' constant", () => {
        expect(serialize(null)).toBe("null");
      });
    });

    describe("symbol", () => {
      it("should return the same value as .toString()", () => {
        const symbol = Symbol("foo");
        expect(serialize(symbol)).toBe(symbol.toString());
      });
    });

    describe("number", () => {
      it("should return the text of the number", () => {
        expect(serialize(1)).toBe("1");
        expect(serialize(1.5)).toBe("1.5");
      });
    });

    describe("bigint", () => {
      it("should return the text of the bit int", () => {
        expect(serialize(BigInt(1000000000000000) * BigInt(1000000000000000))).toBe("1000000000000000000000000000000");
      });
    });

    describe("boolean", () => {
      it("should return the 'true' or 'false' constant", () => {
        expect(serialize(true)).toBe("true");
        expect(serialize(false)).toBe("false");
      });
    });

    describe("string", () => {
      it("should return the string itself", () => {
        expect(serialize("")).toBe("");
        expect(serialize("foo")).toBe("foo");
      });

      it("should limit the maximum length of the serialized string", () => {
        expect(serialize("foobar".repeat(2), { maxLength: 5 })).toBe("fooba...");
      });
    });
  });

  describe("called with an object", () => {
    it("should return the same serialized object as JSON.stringify", () => {
      expect(serialize({})).toBe(JSON.stringify({}));
      expect(serialize({ foo: "bar" })).toBe(JSON.stringify({ foo: "bar" }));
      expect(serialize({ foo: "bar", baz: "qux" })).toBe(JSON.stringify({ foo: "bar", baz: "qux" }));
      expect(serialize({ foo: { bar: "qux" } })).toBe(JSON.stringify({ foo: { bar: "qux" } }));
    });

    it("should preclude circular references", () => {
      const obj1: any = {};
      obj1.ref = obj1; // a reference to the direct parent
      expect(serialize(obj1)).toBe(JSON.stringify({}));

      const obj2: any = {};
      obj2.ref = { ref: obj2 }; // a reference to the parent of the parent
      expect(serialize(obj2)).toBe(JSON.stringify({ ref: {} }));

      const sharedObject = { baz: "qux" };
      const obj3 = { foo: sharedObject, bar: sharedObject }; // diamond-shaped refs; no cycles though
      expect(serialize(obj3)).toBe(JSON.stringify({ foo: { baz: "qux" }, bar: { baz: "qux" } }));

      const obj4: any = { foo: "Lorem", bar: { baz: "Ipsum" } };
      obj4.bar.ref = obj4.bar; // A reference to the parent, but the node also has another property
      expect(serialize(obj4)).toBe(JSON.stringify({ foo: "Lorem", bar: { baz: "Ipsum" } }));

      // Arrays adhere to the same rules (but 'null' is inserted for each excluded circular reference;
      // otherwise the result may be confusing)
      const obj5: any[] = [];
      obj5.push(obj5);
      expect(serialize(obj5)).toBe(JSON.stringify([null]));

      const obj6: any = [1, "Lorem", ["Ipsum"]];
      obj6[2].push(obj6);
      expect(serialize(obj6)).toBe(JSON.stringify([1, "Lorem", ["Ipsum", null]]));

      const obj7: Map<number, any> = new Map();
      obj7.set(1, obj7);
      expect(serialize(obj7)).toBe(JSON.stringify([[1, null]]));

      const obj8: Set<any> = new Set();
      obj8.add(obj8);
      expect(serialize(obj8)).toBe(JSON.stringify([null]));
    });

    it("should limit the maximum size of the serialized object", () => {
      expect(serialize(Array(1000).fill(1), { maxLength: 5 })).toBe("[1,1,...");
    });

    it("should limit the maximum nesting level of the object", () => {
      expect(serialize({ foo: 1, bar: { baz: {}, qux: 2 } }, { maxDepth: 2 })).toBe(
        JSON.stringify({
          // this is nesting level 1
          foo: 1,
          bar: {
            // this is nesting level 2
            // only primitives are included
            qux: 2,
          },
        }),
      );
    });

    it("should replace nested maps and sets with arrays", () => {
      expect(
        serialize({
          foo: new Map([
            [1, "a"],
            [2, "b"],
          ]),
          bar: new Set([1, 2]),
        }),
      ).toBe(
        JSON.stringify({
          foo: [
            [1, "a"],
            [2, "b"],
          ],
          bar: [1, 2],
        }),
      );
    });

    describe("of type Array", () => {
      it("should return the same serialized array as JSON.stringify", () => {
        expect(serialize([])).toBe(JSON.stringify([]));
        expect(serialize([1])).toBe(JSON.stringify([1]));
        expect(serialize([1, "foo"])).toBe(JSON.stringify([1, "foo"]));
        expect(serialize([1, "foo", [2, { bar: "baz" }]])).toBe(JSON.stringify([1, "foo", [2, { bar: "baz" }]]));
      });
    });

    describe("of type Map", () => {
      it("should return array of the key-value pairs", () => {
        expect(serialize(new Map())).toBe("[]");
        expect(serialize(new Map([]))).toBe("[]");
        expect(serialize(new Map([["foo", "bar"]]))).toBe(String.raw`[["foo","bar"]]`);
        expect(
          serialize(
            new Map([
              [1, "foo"],
              [2, "bar"],
            ]),
          ),
        ).toBe(String.raw`[[1,"foo"],[2,"bar"]]`);
      });
    });

    describe("of type Set", () => {
      it("should return array of the set elements", () => {
        expect(serialize(new Set())).toBe("[]");
        expect(serialize(new Set([]))).toBe("[]");
        expect(serialize(new Set([1]))).toBe("[1]");
        expect(serialize(new Set([1, "foo", 2]))).toBe(String.raw`[1,"foo",2]`);
      });
    });
  });
});
