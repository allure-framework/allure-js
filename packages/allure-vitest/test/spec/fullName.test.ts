import { describe, expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runVitestInlineTest } from "../utils.js";

describe("full name", () => {
  it("should set full name", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
      import { test, describe } from "vitest";

      describe("foo", () => {
        describe("bar", () => {
          test("baz", () => {});
        })
      })
    `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].fullName).toBe("dummy:sample.test.ts#foo bar baz");
    expect(tests[0].labels).toEqual(
      expect.arrayContaining([
        {
          name: "_fallbackTestCaseId",
          value: md5("sample.test.ts#foo bar baz"),
        },
      ]),
    );
  });

  it("should use POSIX path to the spec file", async () => {
    const { tests } = await runVitestInlineTest({
      "foo/bar/baz.test.ts": `
      import { test } from "vitest";

      test("qux", () => {});
    `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].fullName).toBe("dummy:foo/bar/baz.test.ts#qux");
  });

  it("should not depend on CWD", async () => {
    const { tests } = await runVitestInlineTest(
      {
        "foo/bar/baz.test.ts": `
      import { test } from "vitest";

      test("qux", () => {});
    `,
      },
      {
        cwd: "foo",
      },
    );

    expect(tests).toHaveLength(1);
    expect(tests[0].fullName).toBe("dummy:foo/bar/baz.test.ts#qux");
  });
});
