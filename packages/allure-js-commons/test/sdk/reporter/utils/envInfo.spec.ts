// @ts-ignore
import properties from "properties";
import { describe, expect, it } from "vitest";
import { stringifyEnvInfo } from "../../../../src/sdk/reporter/utils/envInfo.js";

describe("stringifyEnvInfo", () => {
  it("should match properties.stringify", () => {
    const getExpectedValue = (envInfo: object) => {
      return properties.stringify(envInfo, { unicode: true });
    };

    expect(stringifyEnvInfo({})).toEqual(getExpectedValue({}));

    expect(
      stringifyEnvInfo({
        foo: "bar",
      }),
    ).toEqual(
      getExpectedValue({
        foo: "bar",
      }),
    );

    expect(
      stringifyEnvInfo({
        foo: "bar",
        baz: "qux",
      }),
    ).toEqual(
      getExpectedValue({
        foo: "bar",
        baz: "qux",
      }),
    );

    expect(
      stringifyEnvInfo({
        " : = ": "bar",
      }),
    ).toEqual(
      getExpectedValue({
        " : = ": "bar",
      }),
    );

    expect(
      stringifyEnvInfo({
        foo: " bar baz ",
      }),
    ).toEqual(
      getExpectedValue({
        foo: " bar baz ",
      }),
    );

    expect(
      stringifyEnvInfo({
        foo: "\\\t\n\f\r",
      }),
    ).toEqual(
      getExpectedValue({
        foo: "\\\t\n\f\r",
      }),
    );

    expect(
      stringifyEnvInfo({
        foo: "\0\x1F\x7F\x80",
      }),
    ).toEqual(
      getExpectedValue({
        foo: "\0\x1F\x7F\x80",
      }),
    );

    expect(
      stringifyEnvInfo({
        foo: "𝆕𝆔",
      }),
    ).toEqual(
      getExpectedValue({
        foo: "𝆕𝆔",
      }),
    );
  });
});
