import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../utils";

it("handles jasmine hooks", async () => {
  const { tests } = await runJasmineInlineTest(`
    beforeAll(() => {});

    afterAll(() => {});

    beforeEach(() => {});

    afterEach(() => {});

    it("should pass", () => {
      expect(true).toBe(true);
    });
  `);

  throw new Error("Implement hooks functionality and complete the test!");
});
