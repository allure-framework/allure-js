import { describe, expect, test } from "vitest";
import { runMochaInlineTest } from "../../utils.js";

describe("extra reporters", () => {
  describe("json", () => {
    test("configuration by name", async () => {
      const { tests, stdout } = await runMochaInlineTest({ extraReporters: "json" }, "plain-mocha/testInSuite");

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(JSON.parse(stdout.join(""))).toMatchObject({
        stats: expect.objectContaining({
          suites: 1,
          tests: 1,
          passes: 1,
        }),
      });
    });

    test("configuration by name in array", async () => {
      const { tests, stdout } = await runMochaInlineTest({ extraReporters: ["json"] }, "plain-mocha/testInSuite");

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(JSON.parse(stdout.join(""))).toMatchObject({
        stats: expect.objectContaining({
          suites: 1,
          tests: 1,
          passes: 1,
        }),
      });
    });

    test("configuration by name and option", async () => {
      const { tests, stdout, outputFiles } = await runMochaInlineTest(
        {
          extraReporters: ["json", { output: "output.json" }],
          outputFiles: { "output.json": "application/json" },
        },
        "plain-mocha/testInSuite",
      );

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);

      expect(JSON.parse(outputFiles.get("output.json")?.toString("utf-8") ?? "null")).toMatchObject({
        stats: expect.objectContaining({
          suites: 1,
          tests: 1,
          passes: 1,
        }),
      });

      expect(stdout).toEqual([]);
    });
  });

  describe("two entries", () => {
    test("both are strings", async () => {
      const { tests, stdout } = await runMochaInlineTest(
        {
          extraReporters: ["json-stream", "xunit"],
        },
        "plain-mocha/testInSuite",
      );

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(stdout).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^\["start",/),
          expect.stringMatching(/^\["pass",/),
          expect.stringMatching(/^\["end",/),

          expect.stringMatching(/^<testsuite/),
          expect.stringMatching(/^<testcase/),
          expect.stringMatching(/testsuite>\s*$/),
        ]),
      );
    });

    test("both are option-less arrays", async () => {
      const { tests, stdout } = await runMochaInlineTest(
        {
          extraReporters: [["json-stream"], ["xunit"]],
        },
        "plain-mocha/testInSuite",
      );

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(stdout).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^\["start",/),
          expect.stringMatching(/^\["pass",/),
          expect.stringMatching(/^\["end",/),

          expect.stringMatching(/^<testsuite/),
          expect.stringMatching(/^<testcase/),
          expect.stringMatching(/testsuite>\s*$/),
        ]),
      );
    });

    test("first entry has options", async () => {
      const { tests, stdout, outputFiles } = await runMochaInlineTest(
        {
          extraReporters: [["json", { output: "output.json" }], "xunit"],
          outputFiles: { "output.json": "application/json" },
        },
        "plain-mocha/testInSuite",
      );

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(stdout).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^<testsuite/),
          expect.stringMatching(/^<testcase/),
          expect.stringMatching(/testsuite>\s*$/),
        ]),
      );
      expect(stdout).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^\["start",/),
          expect.stringMatching(/^\["pass",/),
          expect.stringMatching(/^\["end",/),
        ]),
      );
      expect(JSON.parse(outputFiles.get("output.json")?.toString("utf-8") ?? "null")).toMatchObject({
        stats: expect.objectContaining({
          suites: 1,
          tests: 1,
          passes: 1,
        }),
      });
    });

    test("second entry has options", async () => {
      const { tests, stdout, outputFiles } = await runMochaInlineTest(
        {
          extraReporters: ["json", ["xunit", { output: "output.xml" }]],
          outputFiles: { "output.xml": "application/xml" },
        },
        "plain-mocha/testInSuite",
      );

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(JSON.parse(stdout.join(""))).toMatchObject({
        stats: expect.objectContaining({
          suites: 1,
          tests: 1,
          passes: 1,
        }),
      });
      expect(stdout).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^<testsuite/),
          expect.stringMatching(/^<testcase/),
          expect.stringMatching(/testsuite>\s*$/),
        ]),
      );
      expect(outputFiles.get("output.xml")?.toString("utf-8")).toMatch(/<testsuite[^<]+<testcase[^<]+<\/testsuite>/);
    });

    test("both entries have options", async () => {
      const { tests, stdout, outputFiles } = await runMochaInlineTest(
        {
          extraReporters: [
            ["json", { output: "output.json" }],
            ["xunit", { output: "output.xml" }],
          ],
          outputFiles: {
            "output.json": "application/json",
            "output.xml": "application/xml",
          },
        },
        "plain-mocha/testInSuite",
      );

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(stdout).toEqual([]);
      expect(JSON.parse(outputFiles.get("output.json")?.toString("utf-8") ?? "null")).toMatchObject({
        stats: expect.objectContaining({
          suites: 1,
          tests: 1,
          passes: 1,
        }),
      });
      expect(outputFiles.get("output.xml")?.toString("utf-8")).toMatch(/<testsuite[^<]+<testcase[^<]+<\/testsuite>/);
    });

    test("both reporters have done callback", async () => {
      const { tests, stdout, outputFiles } = await runMochaInlineTest(
        {
          extraReporters: [
            ["xunit", { output: "output1.xml" }],
            ["xunit", { output: "output2.xml" }],
          ],
          outputFiles: {
            "output1.xml": "application/xml",
            "output2.xml": "application/xml",
          },
        },
        "plain-mocha/testInSuite",
      );

      expect(tests).toEqual([expect.objectContaining({ name: "a test in a suite" })]);
      expect(stdout).toEqual([]);
      expect(outputFiles.get("output1.xml")?.toString("utf-8")).toMatch(/<testsuite[^<]+<testcase[^<]+<\/testsuite>/);
      expect(outputFiles.get("output2.xml")?.toString("utf-8")).toMatch(/<testsuite[^<]+<testcase[^<]+<\/testsuite>/);
    });
  });

  describe("errors", () => {
    test("a reporter must be a string", async () => {
      const { exitCode, stderr } = await runMochaInlineTest(
        // @ts-ignore
        { extraReporters: 1 },
        "plain-mocha/testInSuite",
      );

      expect(exitCode).not.toEqual(0);
      expect(stderr).toEqual(
        expect.arrayContaining([
          expect.stringContaining("A reporter value must be a string or a constructor. Got number"),
        ]),
      );
    });

    test("a reporter module must exist", async () => {
      const { exitCode, stderr } = await runMochaInlineTest(
        // @ts-ignore
        { extraReporters: "foo" },
        "plain-mocha/testInSuite",
      );

      expect(exitCode).not.toEqual(0);
      expect(stderr).toEqual(expect.arrayContaining([expect.stringContaining("Can't load the 'foo' reporter")]));
    });

    test("a reporter entry can't be an empty array", async () => {
      const { exitCode, stderr } = await runMochaInlineTest(
        // @ts-ignore
        { extraReporters: [] },
        "plain-mocha/testInSuite",
      );

      expect(exitCode).not.toEqual(0);
      expect(stderr).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "If an extra reporter entry is an array, it must contain one or two elements. 0 found",
          ),
        ]),
      );
    });

    test("a reporter entry's module must be a string", async () => {
      const { exitCode, stderr } = await runMochaInlineTest(
        // @ts-ignore
        { extraReporters: [1] },
        "plain-mocha/testInSuite",
      );

      expect(exitCode).not.toEqual(0);
      expect(stderr).toEqual(
        expect.arrayContaining([
          expect.stringContaining("A reporter value must be a string or a constructor. Got number"),
        ]),
      );
    });

    test("a reporter module in the array must be a string", async () => {
      const { exitCode, stderr } = await runMochaInlineTest(
        // @ts-ignore
        { extraReporters: [[1]] },
        "plain-mocha/testInSuite",
      );

      expect(exitCode).not.toEqual(0);
      expect(stderr).toEqual(
        expect.arrayContaining([
          expect.stringContaining("A reporter value must be a string or a constructor. Got number"),
        ]),
      );
    });

    test("a reporter entry in the array can't be an empty array", async () => {
      const { exitCode, stderr } = await runMochaInlineTest(
        // @ts-ignore
        { extraReporters: [[]] },
        "plain-mocha/testInSuite",
      );

      expect(exitCode).not.toEqual(0);
      expect(stderr).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            "If an extra reporter entry is an array, it must contain one or two elements. 0 found",
          ),
        ]),
      );
    });
  });
});
