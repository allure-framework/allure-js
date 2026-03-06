import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../utils.js";

describe("expect.extend", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) =>
          env === "node" ? createVitestConfig(allureResultsPath) : createVitestBrowserConfig(allureResultsPath);
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
            statusDetails: expect.objectContaining({
              message: "some message",
            }),
          }),
        ]);
      });
    });
  }
});
