import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../utils.js";

it("should assign titlePath property to the test result", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample1.spec.js": `
      it("should pass", () => {});
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr.titlePath).toEqual(["spec", "test", "sample1.spec.js"]);
});

it("should assign titlePath property to the test result with suites", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample1.spec.js": `
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

  expect(tr.titlePath).toEqual(["spec", "test", "sample1.spec.js", "foo", "bar"]);
});
