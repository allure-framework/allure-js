import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("title path", () => {
  it("should assign titlePath property to the test result", async () => {
    const { tests } = await runVitestInlineTest({
      "foo/bar/sample.test.ts": `
        import { expect, it } from "vitest";

        it("should pass", () => {
          expect(true).toBe(true);
        });
     `,
    });

    expect(tests).toHaveLength(1);

    const [tr] = tests;

    expect(tr.titlePath).toEqual(["foo", "bar", "sample.test.ts"]);
  });

  it("should assign titlePath property to the test result with suites", async () => {
    const { tests } = await runVitestInlineTest({
      "foo/bar/sample.test.ts": `
        import { describe, expect, it } from "vitest";

        describe("foo", () => {
          describe("bar", () => {
            it("should pass", () => {
              expect(true).toBe(true);
            });
          });
        });
      `,
    });

    expect(tests).toHaveLength(1);

    const [tr] = tests;

    expect(tr.titlePath).toEqual(["foo", "bar", "sample.test.ts", "foo", "bar"]);
  });
});
