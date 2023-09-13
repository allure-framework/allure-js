import assert from "node:assert";
import { expect } from "chai";
import { expect as jestExpect } from "expect";
import {
  ExecutableItem,
  LabelName,
  Status,
  allureLabelRegexp,
  getStatusFromError,
  getSuitesLabels,
  isAnyStepFailed,
  serialize,
  typeToExtension,
} from "allure-js-commons";

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

describe("utils > isAnyStepFailed", () => {
  describe("without any failed step", () => {
    it("returns false", () => {
      // eslint-disable-next-line
      // @ts-ignore
      expect(isAnyStepFailed(fixtures.withoutFailed as ExecutableItem)).eq(false);
    });
  });

  describe("with failed root item", () => {
    it("returns true", () => {
      // eslint-disable-next-line
      // @ts-ignore
      expect(isAnyStepFailed(fixtures.withFailedRoot as ExecutableItem)).eq(true);
    });
  });

  describe("with failed nested step", () => {
    it("returns true", () => {
      // eslint-disable-next-line
      // @ts-ignore
      expect(isAnyStepFailed(fixtures.withFailedNested as ExecutableItem)).eq(true);
    });
  });
});

describe("utils > allureLabelRegexp", () => {
  describe("with non scoped tag", () => {
    it("return FOO", () => {
      // eslint-disable-next-line
      // @ts-ignore
      const labelMatch = "@allure.label.tag=FOO".match(allureLabelRegexp);
      const { name, value } = labelMatch?.groups || {};
      expect(name).eq(LabelName.TAG);
      expect(value).eq("FOO");
    });
  });
  describe("with a scoped tag", () => {
    it("return FOO:123", () => {
      // eslint-disable-next-line
      // @ts-ignore
      const labelMatch = "@allure.label.tag=FOO:123".match(allureLabelRegexp);
      const { name, value } = labelMatch?.groups || {};
      expect(name).eq(LabelName.TAG);
      expect(value).eq("FOO:123");
    });

    it("return FOO:123", () => {
      // eslint-disable-next-line
      // @ts-ignore
      const labelMatch = "@allure.label.tag:FOO:123".match(allureLabelRegexp);
      const { name, value } = labelMatch?.groups || {};
      expect(name).eq(LabelName.TAG);
      expect(value).eq("FOO:123");
    });
  });

  describe("utils > getStatusFromError", () => {
    describe("with node assert error", () => {
      it("returns failed", () => {
        try {
          assert(false, "test");
        } catch (err) {
          expect(getStatusFromError(err as Error)).eq(Status.FAILED);
        }
      });
    });

    describe("with chai assertion error", () => {
      it("returns failed", () => {
        try {
          expect(false).eq(true);
        } catch (err) {
          expect(getStatusFromError(err as Error)).eq(Status.FAILED);
        }
      });
    });

    describe("with jest assertion error", () => {
      it("returns failed", () => {
        try {
          jestExpect(false).toBe(true);
        } catch (err) {
          expect(getStatusFromError(err as Error)).eq(Status.FAILED);
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
          expect(getStatusFromError(err as Error)).eq(Status.FAILED);
        }
      });
    });

    describe("with any error message contains 'assert' word", () => {
      it("returns failed", () => {
        try {
          throw new Error("assertion error");
        } catch (err) {
          expect(getStatusFromError(err as Error)).eq(Status.FAILED);
        }
      });
    });

    describe("with any not-assertion error", () => {
      it("returns broken", () => {
        try {
          throw new Error("an error");
        } catch (err) {
          expect(getStatusFromError(err as Error)).eq(Status.BROKEN);
        }
      });
    });
  });
});

describe("writers > utils > typeToExtension", () => {
  it("should respect provided file extension", () => {
    const extension = typeToExtension({
      contentType: "application/json",
      fileExtension: ".txt",
    });

    expect(extension).eq(".txt");
  });

  it("should respect provided file extension without leading dot", () => {
    const extension = typeToExtension({
      contentType: "application/json",
      fileExtension: "txt",
    });

    expect(extension).eq(".txt");
  });

  it("should get extension for well-known content type", () => {
    const extension = typeToExtension({
      contentType: "application/json",
    });

    expect(extension).eq(".json");
  });

  it("should get extension for allure imagediff", () => {
    const extension = typeToExtension({
      contentType: "application/vnd.allure.image.diff",
    });

    expect(extension).eq(".imagediff");
  });

  it("should get an empty extension for unknown type", () => {
    const extension = typeToExtension({
      contentType: "application/vnd.unknown",
    });

    expect(extension).eq("");
  });
});

describe("utils > getSuitesLabels", () => {
  describe("with empty suites", () => {
    it("returns empty array", () => {
      expect(getSuitesLabels([])).eql([]);
    });
  });

  describe("with single suite", () => {
    it("returns parent suite label as the first element", () => {
      expect(getSuitesLabels(["foo"])).eql([
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
      ]);
    });
  });

  describe("with two suites", () => {
    it("returns parent suite and suite labels as the first two elements", () => {
      expect(getSuitesLabels(["foo", "bar"])).eql([
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
      expect(getSuitesLabels(["foo", "bar", "baz", "beep", "boop"])).eql([
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
      expect(serialize({ foo: "bar" })).eq('{"foo":"bar"}');
    });
  });

  describe("with array", () => {
    it("returns JSON string", () => {
      // eslint-disable-next-line @typescript-eslint/quotes
      expect(serialize(["foo", "bar"])).eq('["foo","bar"]');
    });
  });

  describe("with map", () => {
    it("returns JSON string", () => {
      expect(serialize(new Map([["foo", "bar"]]))).eq("[object Map]");
    });
  });

  describe("with set", () => {
    it("returns JSON string", () => {
      expect(serialize(new Set(["foo", "bar"]))).eq("[object Set]");
    });
  });

  describe("with undefined", () => {
    it("returns undefined string", () => {
      expect(serialize(undefined)).eq("undefined");
    });
  });

  describe("with null", () => {
    it("returns null string", () => {
      expect(serialize(null)).eq("null");
    });
  });

  describe("with function", () => {
    it("returns function string", () => {
      expect(serialize(() => {})).eq("() => { }");
    });
  });

  describe("with primitives", () => {
    it("returns stringified value", () => {
      // eslint-disable-next-line @typescript-eslint/quotes
      expect(serialize("foo")).eq("foo");
      expect(serialize(123)).eq("123");
      expect(serialize(true)).eq("true");
    });
  });
});
