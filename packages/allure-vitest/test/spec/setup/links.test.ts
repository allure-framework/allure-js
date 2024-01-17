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

      test("link", async (t) => {
        await this.allure.link("foo", "https://example.org", "bar");
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

      test("issue", async () => {
        await this.allure.issue("foo", "https://example.org/issue/1");
        await this.allure.issue("bar", "2");
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

      test("tms", async (t) => {
        await this.allure.tms("foo", "https://example.org/tms/1");
        await this.allure.tms("bar", "2");
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
