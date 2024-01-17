import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runVitestInlineTest } from "../../utils.js";

const config = (testDir: string) => `
  import AllureReporter from "allure-vitest/reporter";
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      setupFiles: ["allure-vitest/setup"],
      reporters: [
        "default",
        new AllureReporter({
          testMode: true,
          links: [
            {
              type: "issue",
              urlTemplate: "https://example.org/issue/%s",
            },
            {
              type: "tms",
              urlTemplate: "https://example.org/tms/%s",
            },
          ],
          resultsDir: "${join(testDir, "allure-results")}",
        }),
      ],
    },
  });
`;

describe("links", () => {
  it("link", async () => {
    const { tests } = await runVitestInlineTest(
      `
      import { test } from "vitest";
      import { link } from "allure-vitest";

      test("link", async (t) => {
        await link(t, "foo", "https://example.org", "bar");
      });
      `,
    );

    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual({
      name: "bar",
      type: "foo",
      url: "https://example.org",
    });
  });

  it("issue", async () => {
    const { tests } = await runVitestInlineTest(
      `
      import { test } from "vitest";
      import { issue } from "allure-vitest";

      test("issue", async (t) => {
        await issue(t, "foo", "https://example.org/issue/1");
        await issue(t, "bar", "2");
      });
      `,
      config,
    );

    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual({
      name: "foo",
      type: LinkType.ISSUE,
      url: "https://example.org/issue/1",
    });
    expect(tests[0].links).toContainEqual({
      name: "bar",
      type: LinkType.ISSUE,
      url: "https://example.org/issue/2",
    });
  });

  it("tms", async () => {
    const { tests } = await runVitestInlineTest(
      `
      import { test } from "vitest";
      import { tms } from "allure-vitest";

      test("tms", async (t) => {
        await tms(t, "foo", "https://example.org/tms/1");
        await tms(t, "bar", "2");
      });
      `,
      config,
    );

    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual({
      name: "foo",
      type: LinkType.TMS,
      url: "https://example.org/tms/1",
    });
    expect(tests[0].links).toContainEqual({
      name: "bar",
      type: LinkType.TMS,
      url: "https://example.org/tms/2",
    });
  });
});
