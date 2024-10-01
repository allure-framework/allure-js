// @ts-ignore
import properties from "properties";
import { describe, expect, it } from "vitest";
import { stringifyEnvInfo } from "../../../../src/sdk/reporter/utils/envInfo.js";
import type { EnvironmentInfo } from "../../../../src/sdk/types.js";

describe("stringifyEnvInfo", () => {
  it("should serialize empty object", () => {
    expect(stringifyEnvInfo({})).toEqual("");
  });

  it("should serialize object with single property", () => {
    expect(stringifyEnvInfo({ foo: "bar" })).toEqual("foo=bar");
  });

  it("should serialize object with two properties", () => {
    expect(stringifyEnvInfo({ foo: "bar", baz: "qux" })).toMatch(/^foo=bar(?:\n|\r\n)baz=qux$/);
  });

  it("should escape whitespaces in a key", () => {
    expect(stringifyEnvInfo({ " foo bar ": "baz" })).toEqual("\\ foo\\ bar\\ =baz");
  });

  it("should escape whitespaces at the beginning of a value", () => {
    expect(stringifyEnvInfo({ foo: "  bar" })).toEqual("foo=\\ \\ bar");
    expect(stringifyEnvInfo({ foo: "\t bar" })).toEqual("foo=\\t\\ bar");
    expect(stringifyEnvInfo({ foo: "\f bar" })).toEqual("foo=\\f\\ bar");
  });

  it("should not escape whitespaces after a non-whitespace char in a value", () => {
    expect(stringifyEnvInfo({ foo: "bar " })).toEqual("foo=bar ");
    expect(stringifyEnvInfo({ foo: "bar baz" })).toEqual("foo=bar baz");
  });

  it("should escape control chars in a value", () => {
    expect(stringifyEnvInfo({ foo: "\\" })).toEqual("foo=\\\\");
    expect(stringifyEnvInfo({ foo: "\t" })).toEqual("foo=\\t");
    expect(stringifyEnvInfo({ foo: "\n" })).toEqual("foo=\\n");
    expect(stringifyEnvInfo({ foo: "\f" })).toEqual("foo=\\f");
    expect(stringifyEnvInfo({ foo: "\r" })).toEqual("foo=\\r");
  });

  it("should escape chars from control sets 0 and 1 in a value", () => {
    expect(stringifyEnvInfo({ foo: "\0" })).toEqual("foo=\\u0000");
    expect(stringifyEnvInfo({ foo: "\x1F" })).toEqual("foo=\\u001f");
    expect(stringifyEnvInfo({ foo: "\x7F" })).toEqual("foo=\\u007f");
    expect(stringifyEnvInfo({ foo: "\x80" })).toEqual("foo=\\u0080");
  });

  it("should escape unicode", () => {
    expect(stringifyEnvInfo({ foo: "Ψ" })).toEqual("foo=\\u03a8");
    expect(stringifyEnvInfo({ foo: "𝆔" })).toEqual("foo=\\ud834\\udd94");
  });

  it("should be compatible with properties.parse", () => {
    const envInfo: EnvironmentInfo = {
      foo: "bar",
      [" : = "]: "baz",
      qux: " \t\f \\\t\n\f\r \0\x7f\x80",
      quux: "𝆔Ψ𝆔",
    };

    expect(properties.parse(stringifyEnvInfo(envInfo), { unicode: true })).toEqual(envInfo);
  });
});
