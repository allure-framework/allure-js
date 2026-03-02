import { beforeAll, describe, expect, it } from "vitest";
import {
  type TestFileAccessor,
  createVitestBrowserConfig,
  createVitestConfig,
  runVitestInlineTest,
} from "../../../utils.js";

describe("attachments", () => {
  describe('for "node"', () => {
    it("adds attachments", async () => {
      const { tests, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { test } from "vitest";
  import { attachment } from "allure-js-commons";

  test("text attachment", async () => {
    await attachment("foo.txt", Buffer.from("bar"), "text/plain");
  });
`,
      });

      expect(tests).toHaveLength(1);
      const [step] = tests[0].steps;
      expect(step.name).toBe("foo.txt");

      const [attachment] = step.attachments;

      expect(attachment.name).toBe("foo.txt");
      expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
    });
  });

  describe('for "browser"', () => {
    it("adds attachments", async () => {
      const { tests, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath),
        "sample.test.ts": `
  import { test } from "vitest";
  import { attachment } from "allure-js-commons";

  test("text attachment", async () => {
    await attachment("foo.txt", new TextEncoder().encode("bar"), "text/plain");
  });
`,
      });

      expect(tests).toHaveLength(1);
      const [step] = tests[0].steps;
      expect(step.name).toBe("foo.txt");

      const [attachment] = step.attachments;

      expect(attachment.name).toBe("foo.txt");
      expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
    });
  });
});
