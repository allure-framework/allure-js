import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("expect.extend", () => {
  it("should support expect.extend", async () => {
    const { tests } = await runVitestInlineTest(`
    import { test, expect } from "vitest";

    expect.extend({ toFail() { return { pass: false, message: () => "some message" }; } });

    test("fail test", () => {
      expect({}).toFail();
    });

  `);

    expect(tests).toHaveLength(1);
    expect(tests).toEqual([
      expect.objectContaining({
        name: "fail test",
        status: "failed",
        statusDetails: expect.objectContaining({
          message: "some message",
        }),
      }),
    ]);
  });
});
