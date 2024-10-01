// @ts-ignore
import properties from "properties";
import { describe, expect, it } from "vitest";
import { parseEnvInfo, stringifyEnvInfo } from "../../../../src/sdk/reporter/utils/envInfo.js";
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

  it("should escape colon in a key", () => {
    expect(stringifyEnvInfo({ "foo:bar": "baz" })).toEqual("foo\\:bar=baz");
  });

  it("should escape equal sign in a key", () => {
    expect(stringifyEnvInfo({ "foo=bar": "baz" })).toEqual("foo\\=bar=baz");
  });

  it("should escape control chars in a key", () => {
    expect(stringifyEnvInfo({ "foo\\bar": "baz" })).toEqual("foo\\\\bar=baz");
    expect(stringifyEnvInfo({ "foo\tbar": "baz" })).toEqual("foo\\tbar=baz");
    expect(stringifyEnvInfo({ "foo\nbar": "baz" })).toEqual("foo\\nbar=baz");
    expect(stringifyEnvInfo({ "foo\fbar": "baz" })).toEqual("foo\\fbar=baz");
    expect(stringifyEnvInfo({ "foo\rbar": "baz" })).toEqual("foo\\rbar=baz");
  });

  it("should escape chars from control sets 0 and 1 in a key", () => {
    expect(stringifyEnvInfo({ "foo\0bar": "baz" })).toEqual("foo\\u0000bar=baz");
    expect(stringifyEnvInfo({ "foo\x1Fbar": "baz" })).toEqual("foo\\u001fbar=baz");
    expect(stringifyEnvInfo({ "foo\x7Fbar": "baz" })).toEqual("foo\\u007fbar=baz");
    expect(stringifyEnvInfo({ "foo\x80bar": "baz" })).toEqual("foo\\u0080bar=baz");
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

  it("should escape unicode in keys and values", () => {
    expect(stringifyEnvInfo({ Δ: "Σ" })).toEqual("\\u0394=\\u03a3");
    expect(stringifyEnvInfo({ "𝅘𝅥𝅲": "𝆔" })).toEqual("\\ud834\\udd64=\\ud834\\udd94");
  });

  it("should skip null and undefined values", () => {
    expect(stringifyEnvInfo({ foo: undefined })).toEqual("");
    expect(stringifyEnvInfo({ foo: null } as any as EnvironmentInfo)).toEqual("");
  });

  it("should be compatible with properties.parse", () => {
    const envInfo: EnvironmentInfo = {
      foo: "bar",
      [" : = \t\f\\\n\r\0\x7f\x80"]: "baz",
      qux: " \t\f \\\t\n\f\r \0\x7f\x80",
      quux: "𝆔Ψ𝆔",
      ["𝅘𝅥𝅲"]: "𝆔",
    };

    expect(properties.parse(stringifyEnvInfo(envInfo), { unicode: true })).toEqual(envInfo);
  });
});

describe("parseEnvInfo", () => {
  it("should parse empty string", () => {
    expect(parseEnvInfo("")).toEqual({});
  });

  it("should parse single kv-pair", () => {
    expect(parseEnvInfo("foo=bar")).toEqual({ foo: "bar" });
  });

  it("should parse multiple kv-pairs", () => {
    expect(parseEnvInfo("foo=bar\nbaz=qux")).toEqual({ foo: "bar", baz: "qux" });
  });

  it("should ignore extra whitespaces", () => {
    expect(parseEnvInfo(" \t\f\rfoo \t\f\r= \t\f\rbar\r\n")).toEqual({ foo: "bar" });
  });

  it("should support multiline values", () => {
    expect(parseEnvInfo("foo=bar\\\n    baz")).toEqual({ foo: "barbaz" });
  });

  it("should decode keys", () => {
    expect(parseEnvInfo("\\==foo")).toEqual({ "=": "foo" });
    expect(parseEnvInfo("\\:=foo")).toEqual({ ":": "foo" });
    expect(parseEnvInfo("\\ =foo")).toEqual({ " ": "foo" });
    expect(parseEnvInfo("\\t=foo")).toEqual({ "\t": "foo" });
    expect(parseEnvInfo("\\n=foo")).toEqual({ "\n": "foo" });
    expect(parseEnvInfo("\\f=foo")).toEqual({ "\f": "foo" });
    expect(parseEnvInfo("\\r=foo")).toEqual({ "\r": "foo" });
    expect(parseEnvInfo("\\u007f=foo")).toEqual({ "\x7f": "foo" });
    expect(parseEnvInfo("\\u0080=foo")).toEqual({ "\x80": "foo" });
  });

  it("should decode values", () => {
    expect(parseEnvInfo("foo=\\ ")).toEqual({ foo: " " });
    expect(parseEnvInfo("foo=\\r")).toEqual({ foo: "\r" });
    expect(parseEnvInfo("foo=\\f")).toEqual({ foo: "\f" });
    expect(parseEnvInfo("foo=\\n")).toEqual({ foo: "\n" });
    expect(parseEnvInfo("foo=\\t")).toEqual({ foo: "\t" });
    expect(parseEnvInfo("foo=\\u007f")).toEqual({ foo: "\x7f" });
    expect(parseEnvInfo("foo=\\u0080")).toEqual({ foo: "\x80" });
  });

  it("should decode unicode", () => {
    expect(parseEnvInfo("\\u0394=\\u03a3")).toEqual({ Δ: "Σ" });
    expect(parseEnvInfo("\\ud834\\udd64=\\ud834\\udd94")).toEqual({ "𝅘𝅥𝅲": "𝆔" });
  });

  it("should be compatible with stringifyEnvInfo", () => {
    const envInfo: EnvironmentInfo = {
      foo: "bar",
      [" : = \t\f\\\n\r\0\x7f\x80"]: "baz",
      qux: " \t\f \\\t\n\f\r \0\x7f\x80",
      quux: "𝆔Ψ𝆔",
      ["𝅘𝅥𝅲"]: "𝆔",
    };

    expect(parseEnvInfo(stringifyEnvInfo(envInfo))).toEqual(envInfo);
  });
});
