import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { createFileContext, createRunState } from "../../src/state.js";
import type { BunWrappedFn } from "../../src/types.js";
import { createWrappedTest } from "../../src/wrappers.js";
import { runBunInlineTest } from "../utils.js";
import { getTestByName, getTestsByName } from "./helpers.js";

it("resolves native test modifiers lazily from aliases", () => {
  const registered: string[] = [];
  const source = (() => undefined) as BunWrappedFn;
  const alias = (() => undefined) as BunWrappedFn;
  const aliasOnly = function (this: BunWrappedFn, name: string) {
    expect(this).toBe(alias);
    registered.push(name);
  } as BunWrappedFn;
  const fileContext = createFileContext("/tmp/lazy-only.test.ts", createRunState());
  const wrapped = createWrappedTest(
    source,
    {
      activateFileContext: () => {},
      getFileContext: () => fileContext,
    },
    [alias],
  );

  alias.only = aliasOnly;
  aliasOnly.each = () => {
    registered.push("native only.each");
    return () => {};
  };
  (wrapped.only as BunWrappedFn).each([["alpha"], ["beta"]])("only %s", () => {});

  expect(registered).toEqual(["only alpha", "only beta"]);
});

it("supports conditional and failing Bun modifier factories", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { describe, expect, test } from "bun:test";

      test.if(false)("test if false", () => {
        throw new Error("should not run");
      });

      test.if(true)("test if true", () => {
        expect(true).toBe(true);
      });

      test.skipIf(true)("test skipIf true", () => {
        throw new Error("should not run");
      });

      test.todoIf(true)("test todoIf true", () => {
        expect(1).toBe(2);
      });

      test.failing("expected fail", () => {
        expect(1).toBe(2);
      });

      test.failing("unexpected pass", () => {
        expect(1).toBe(1);
      });

      describe.if(false)("suite if false", () => {
        test("nested if false", () => {
          throw new Error("should not run");
        });
      });

      describe.if(true)("suite if true", () => {
        test("nested if true", () => {
          expect(true).toBe(true);
        });
      });

      describe.skipIf(true)("suite skipIf true", () => {
        test("nested skipIf true", () => {
          throw new Error("should not run");
        });
      });

      describe.todoIf(true)("suite todoIf true", () => {
        test("nested todoIf true", () => {
          expect(1).toBe(2);
        });
      });
    `,
  });

  expect(exitCode).toBe(1);
  expect(tests).toHaveLength(10);
  expect(getTestByName(tests, "test if false")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "test if true")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "test skipIf true")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "test todoIf true")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "TODO",
      }),
    }),
  );
  expect(getTestByName(tests, "expected fail")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "unexpected pass")).toEqual(
    expect.objectContaining({
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("marked as failing"),
      }),
    }),
  );
  expect(getTestByName(tests, "nested if false")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "nested if true")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "nested skipIf true")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "nested todoIf true")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "TODO",
      }),
    }),
  );
});

it("fails fast for Bun concurrent mode before tests execute", async () => {
  const { tests, exitCode, stdout, stderr } = await runBunInlineTest(
    {
      "sample.test.ts": `
        import { expect, test } from "bun:test";

        test("first concurrent candidate", async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          expect(true).toBe(true);
        });

        test("second concurrent candidate", async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          expect(true).toBe(true);
        });
      `,
    },
    {
      args: ["--concurrent"],
    },
  );

  expect(exitCode).toBe(1);
  expect(tests).toHaveLength(0);
  expect(`${stdout.join("\n")}\n${stderr.join("\n")}`).toContain("allure-bun does not support concurrent tests");
  expect(`${stdout.join("\n")}\n${stderr.join("\n")}`).not.toContain("(pass)");
});

it("fails fast for randomized Bun order before tests execute", async () => {
  const { tests, exitCode, stdout, stderr } = await runBunInlineTest(
    {
      "sample.test.ts": `
        import { expect, test } from "bun:test";

        test("first random candidate", () => {
          expect(true).toBe(true);
        });

        test("second random candidate", () => {
          expect(true).toBe(true);
        });
      `,
    },
    {
      args: ["--randomize"],
    },
  );

  expect(exitCode).toBe(1);
  expect(tests).toHaveLength(0);
  expect(`${stdout.join("\n")}\n${stderr.join("\n")}`).toContain("allure-bun does not support randomized test order");
  expect(`${stdout.join("\n")}\n${stderr.join("\n")}`).not.toContain("(pass)");
});

it("does not report static skipped tests excluded by Bun name pattern", async () => {
  const { tests, exitCode } = await runBunInlineTest(
    {
      "sample.test.ts": `
        import { expect, test } from "bun:test";

        test.skip("static skipped outside filter", () => {
          throw new Error("should not run");
        });

        test("selected by pattern", () => {
          expect(true).toBe(true);
        });
      `,
    },
    {
      args: ["-t", "selected"],
    },
  );

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(1);
  expect(getTestByName(tests, "selected by pattern")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
});

it("supports parameterized Bun test factories", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { expect, test } from "bun:test";

      test.each([["alpha", 1]])("case %s %i", (label, value) => {
        expect(label).toBe("alpha");
        expect(value).toBe(1);
      });

      test.skip.each([[2]])("skip case %i", (value) => {
        expect(value).toBe(2);
      });

      test.serial.each([[3], [4]])("serial case %i", (value) => {
        expect(value).toBeGreaterThan(0);
      });

      test.if(true).each([[5]])("if each %i", (value) => {
        expect(value).toBe(5);
      });

      test.skipIf(true).each([[6]])("skipIf each %i", (value) => {
        expect(value).toBe(6);
      });

      test.todoIf(true).each([[7]])("todoIf each %i", (value) => {
        expect(value).toBe(7);
      });

      test.failing.each([[8], [9]])("failing each %i", (value) => {
        if (value === 8) {
          expect(value).toBe(0);
        } else {
          expect(value).toBe(9);
        }
      });
    `,
  });

  expect(exitCode).toBe(1);
  expect(tests).toHaveLength(9);
  expect(getTestByName(tests, "case alpha 1")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: "arg0", value: "alpha" }),
        expect.objectContaining({ name: "arg1", value: "1" }),
      ]),
    }),
  );
  expect(getTestByName(tests, "skip case 2")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "serial case 3")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "serial case 4")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "if each 5")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "skipIf each 6")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "todoIf each 7")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "TODO",
      }),
    }),
  );
  expect(getTestByName(tests, "failing each 8")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(tests, "failing each 9")).toEqual(
    expect.objectContaining({
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("marked as failing"),
      }),
    }),
  );
});

it("supports parameterized Bun describe factories", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { describe, expect, test } from "bun:test";

      describe.each([[1, 2, 3]])("sum %i %i", (left, right, expected) => {
        test("returns result", () => {
          expect(left + right).toBe(expected);
        });
      });

      describe.skip.each([[4, 5, 9]])("skipped sum %i %i", (left, right, expected) => {
        test("returns skipped result", () => {
          expect(left + right).toBe(expected);
        });
      });

      describe.if(true).each([[6, 7, 13]])("if sum %i %i", (left, right, expected) => {
        test("returns conditional result", () => {
          expect(left + right).toBe(expected);
        });
      });

      describe.skipIf(true).each([[8, 9, 17]])("skipIf sum %i %i", (left, right, expected) => {
        test("returns skipped conditional result", () => {
          expect(left + right).toBe(expected);
        });
      });

      describe.todoIf(true).each([[10, 11, 21]])("todo sum %i %i", (left, right, expected) => {
        test("returns todo result", () => {
          expect(left + right).toBe(expected);
        });
      });
    `,
  });

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(5);
  expect(getTestByName(tests, "returns result").fullName).toBe("sample.test.ts#sum 1 2 returns result");
  expect(getTestByName(tests, "returns skipped result")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      fullName: "sample.test.ts#skipped sum 4 5 returns skipped result",
    }),
  );
  expect(getTestByName(tests, "returns conditional result")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
      fullName: "sample.test.ts#if sum 6 7 returns conditional result",
    }),
  );
  expect(getTestByName(tests, "returns skipped conditional result")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      fullName: "sample.test.ts#skipIf sum 8 9 returns skipped conditional result",
    }),
  );
  expect(getTestByName(tests, "returns todo result")).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      fullName: "sample.test.ts#todo sum 10 11 returns todo result",
      statusDetails: expect.objectContaining({
        message: "TODO",
      }),
    }),
  );
});

// FIXME: pass locally, but fails every time on CI
it.skip("supports Bun only.each variants", async () => {
  const testOnly = await runBunInlineTest(
    {
      "sample.test.ts": `
      import { expect, test } from "bun:test";

      test.only.each([["alpha"], ["beta"]])("only %s", (label) => {
        expect(typeof label).toBe("string");
      });
    `,
    },
    {
      args: ["--only"],
    },
  );

  expect(testOnly.tests).toHaveLength(2);
  expect(getTestByName(testOnly.tests, "only alpha")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(getTestByName(testOnly.tests, "only beta")).toEqual(
    expect.objectContaining({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );

  const describeOnly = await runBunInlineTest(
    {
      "sample.test.ts": `
      import { describe, expect, test } from "bun:test";

      describe.only.each([[1], [2]])("only suite %i", (value) => {
        test("runs", () => {
          expect(value).toBeGreaterThan(0);
        });
      });
    `,
    },
    {
      args: ["--only"],
    },
  );

  expect(describeOnly.tests).toHaveLength(2);
  expect(getTestsByName(describeOnly.tests, "runs").map((test) => test.fullName)).toEqual(
    expect.arrayContaining(["sample.test.ts#only suite 1 runs", "sample.test.ts#only suite 2 runs"]),
  );
});

it("matches Bun's current each title formatting", async () => {
  const { tests, exitCode } = await runBunInlineTest({
    "sample.test.ts": `
      import { expect, test } from "bun:test";

      test.each([
        ["hello", 123],
      ])("string: %s, number: %i, index: %#", (label, value) => {
        expect(label).toBe("hello");
        expect(value).toBe(123);
      });

      test.each([
        [{ value: 7 }],
      ])("object index %# and field $value", ({ value }) => {
        expect(value).toBe(7);
      });

      test.each([
        [{ a: 1 }, { b: 2 }],
      ])("json %j object %o", (jsonValue, objectValue) => {
        expect(jsonValue.a).toBe(1);
        expect(objectValue.b).toBe(2);
      });

      test.each([
        [{ a: 1 }],
      ])("%p", (value) => {
        expect(value.a).toBe(1);
      });

      test.each([
        [1.25],
      ])("float %f percent %%", (value) => {
        expect(value).toBe(1.25);
      });
    `,
  });

  expect(exitCode).toBe(0);
  expect(tests.map((test) => test.name)).toEqual(
    expect.arrayContaining([
      "string: hello, number: 123, index: %#",
      "object index 0 and field 7",
      'json {"a":1} object {"b":2}',
      "{\n a: 1,\n}",
      "float 1.25 percent %",
    ]),
  );
});
