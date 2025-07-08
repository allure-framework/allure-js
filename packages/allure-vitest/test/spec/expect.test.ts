import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("expect", () => {
  it("should add actual and expected values when using expect", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
    import { test, expect } from "vitest";

    test("fail test", () => {
      expect("a value").toEqual("the other one");
    });

  `,
    });

    expect(tests).toHaveLength(1);
    expect(tests).toMatchObject([
      {
        name: "fail test",
        status: "failed",
        statusDetails: {
          message: "expected 'a value' to deeply equal 'the other one'",
          expected: "the other one",
          actual: "a value",
        },
      },
    ]);
  });
  it("should add actual and expected values when using expect with match object", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
    import { test, expect } from "vitest";

    test("fail test", () => {
      expect({ nested: { obj: "value", n: 123}}).toMatchObject({ nested: { obj: "some"} });
    });

  `,
    });

    expect(tests).toHaveLength(1);
    expect(tests).toMatchObject([
      {
        name: "fail test",
        status: "failed",
        statusDetails: {
          expected: "Object {\n" + '  "nested": Object {\n' + '    "obj": "some",\n' + "  },\n" + "}",
          actual: "Object {\n" + '  "nested": Object {\n' + '    "obj": "value",\n' + "  },\n" + "}",
        },
      },
    ]);
  });

  // this is the way vitest process errors
  it("should add actual and expected values when regular exception is thrown", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
    import { test, expect } from "vitest";

    test("fail test", () => {
      throw new Error("fail!")
    });

  `,
    });

    expect(tests).toHaveLength(1);
    expect(tests).toMatchObject([
      {
        name: "fail test",
        status: "broken",
        statusDetails: {
          expected: "undefined",
          actual: "undefined",
        },
      },
    ]);
  });
});
