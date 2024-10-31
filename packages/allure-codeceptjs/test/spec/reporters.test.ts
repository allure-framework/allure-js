import { describe, expect, it } from "vitest";
import { issue } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

describe("mocha reporters", () => {
  it("cli should be enabled by default", async () => {
    const { tests, stdout } = await runCodeceptJsInlineTest({
      "foo.test.js": `
        Feature("foo")
        Scenario('bar', () => {});
        `,
    });

    expect(tests).toEqual([expect.objectContaining({ name: "bar" })]);
    expect(stdout.join("").split("\n")).toEqual(expect.arrayContaining([expect.stringMatching(/^foo --/)]));
  });

  it("cli --steps should work out-of-box", async () => {
    await issue("1167");

    const { tests, stdout } = await runCodeceptJsInlineTest(
      {
        "foo.test.js": `
          Feature("foo")
          Scenario('bar', () => {});
          `,
      },
      { args: ["--steps"] },
    );

    expect(tests).toEqual([expect.objectContaining({ name: "bar" })]);
    expect(stdout.join("").split("\n")).toEqual(
      expect.arrayContaining([expect.stringMatching(/^foo --/), expect.stringMatching(/^ {2}bar/)]),
    );
  });

  it("should support Mocha's built-in reporters", async () => {
    const { tests, stdout } = await runCodeceptJsInlineTest({
      "foo.test.js": `
        Feature("foo")
        Scenario('bar', () => {});
        `,
      "codecept.conf.js": `
        const path = require("node:path");
        exports.config = {
          tests: "./**/*.test.js",
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
          },
          mocha: {
            reporter: "json",
          },
        };
      `,
    });

    const stdoutLines = stdout.join("").split("\n");

    expect(tests).toEqual([expect.objectContaining({ name: "bar" })]);
    const jsonString = stdoutLines.slice(stdoutLines.indexOf("{")).join("");
    expect(JSON.parse(jsonString)).toMatchObject({
      stats: expect.objectContaining({
        suites: 1,
        tests: 1,
      }),
    });
    expect(stdoutLines).not.toEqual(
      // no default cli reporter
      expect.arrayContaining([expect.stringMatching(/^foo --/)]),
    );
  });

  it("should support local reporters", async () => {
    const { tests, stdout } = await runCodeceptJsInlineTest({
      "foo.test.js": `
        Feature("foo")
        Scenario('bar', () => {});
        `,
      "reporter.cjs": `
        module.exports = function (r, o) {
          r.on("start", () => {
            console.log(JSON.stringify(o.reporterOptions));
          });
        };
      `,
      "codecept.conf.js": `
        const path = require("node:path");
        exports.config = {
          tests: "./**/*.test.js",
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
          },
          mocha: {
            reporter: "reporter.cjs",
            reporterOptions: { foo: "bar" },
          },
        };
      `,
    });

    const stdoutLines = stdout.join("").split("\n");

    expect(tests).toEqual([expect.objectContaining({ name: "bar" })]);
    expect(stdoutLines).toEqual(expect.arrayContaining([String.raw`{"foo":"bar"}`]));
  });

  it("should support reporter constructors", async () => {
    const { tests, stdout } = await runCodeceptJsInlineTest({
      "foo.test.js": `
        Feature("foo")
        Scenario('bar', () => {});
        `,
      "codecept.conf.js": `
        const path = require("node:path");
        exports.config = {
          tests: "./**/*.test.js",
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
          },
          mocha: {
            reporter: function (r, o) {
              r.on("start", () => {
                console.log(JSON.stringify(o.reporterOptions));
              });
            },
            reporterOptions: { foo: { bar: "baz" } },
          },
        };
      `,
    });

    const stdoutLines = stdout.join("").split("\n");

    expect(tests).toEqual([expect.objectContaining({ name: "bar" })]);
    expect(stdoutLines).toEqual(expect.arrayContaining([String.raw`{"foo":{"bar":"baz"}}`]));
  });
});
