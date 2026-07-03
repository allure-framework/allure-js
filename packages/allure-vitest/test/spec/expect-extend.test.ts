import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../utils.js";

describe("expect.extend", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("should support expect.extend", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "sample.test.ts": `
    import { test, expect } from "vitest";

    expect.extend({ toFail() { return { pass: false, message: () => "some message" }; } });

    test("fail test", () => {
      expect({}).toFail();
    });

  `,
      });

      expect(tests).toHaveLength(1);
      expect(tests).toEqual([
        expect.objectContaining({
          name: "fail test",
          status: "failed",
          steps: [
            expect.objectContaining({
              name: "expect({}).toFail()",
              status: "failed",
            }),
          ],
          statusDetails: expect.objectContaining({
            message: "some message",
          }),
        }),
      ]);
    });
  });
});
