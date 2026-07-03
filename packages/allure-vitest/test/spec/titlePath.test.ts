import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, runVitestInlineTest, vitestTestEnvironments } from "../utils.js";

describe("title path", () => {
  describe.each(vitestTestEnvironments)('for "%s"', (_env, createConfig) => {
    let configFileAccessor: TestFileAccessor;

    beforeAll(() => {
      configFileAccessor = ({ allureResultsPath }) => createConfig(allureResultsPath);
    });

    it("should assign titlePath property to the test result", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
        "foo/bar/sample.test.ts": `
        import { expect, it } from "vitest";

        it("should pass", () => {
          expect(true).toBe(true);
        });
     `,
      });

      expect(tests).toHaveLength(1);

      const [tr] = tests;

      expect(tr.titlePath).toEqual(["dummy", "foo", "bar", "sample.test.ts"]);
    });

    it("should assign titlePath property to the test result with suites", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": configFileAccessor,
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

      expect(tr.titlePath).toEqual(["dummy", "foo", "bar", "sample.test.ts", "foo", "bar"]);
    });
  });
});
