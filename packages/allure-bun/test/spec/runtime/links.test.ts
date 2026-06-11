import { LinkType } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../utils.js";

describe("links", () => {
  it("adds generic links", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { link } from "allure-js-commons";

        test("link", async () => {
          await link("https://example.org", "Example", "custom");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual({
      name: "Example",
      type: "custom",
      url: "https://example.org",
    });
  });

  it("adds multiple links", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { links } from "allure-js-commons";

        test("links", async () => {
          await links(
            { url: "https://example.org/one", name: "One", type: "one" },
            { url: "https://example.org/two", name: "Two", type: "two" },
          );
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].links).toEqual(
      expect.arrayContaining([
        { name: "One", type: "one", url: "https://example.org/one" },
        { name: "Two", type: "two", url: "https://example.org/two" },
      ]),
    );
  });

  it("adds issue and tms links with templates", async () => {
    const { tests, exitCode } = await runBunInlineTest(
      {
        "sample.test.ts": `
          import { test } from "bun:test";
          import { issue, tms } from "allure-js-commons";

          test("known links", async () => {
            await issue("ISSUE-1", "Issue 1");
            await tms("CASE-1", "Case 1");
          });
        `,
      },
      {
        env: () => ({
          ALLURE_BUN_CONFIG: JSON.stringify({
            links: {
              issue: {
                urlTemplate: "https://issues.example/%s",
              },
              tms: {
                urlTemplate: "https://tms.example/%s",
              },
            },
          }),
        }),
      },
    );

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].links).toEqual(
      expect.arrayContaining([
        { name: "Issue 1", type: LinkType.ISSUE, url: "https://issues.example/ISSUE-1" },
        { name: "Case 1", type: LinkType.TMS, url: "https://tms.example/CASE-1" },
      ]),
    );
  });

  it("adds links from before fixtures to linked tests", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { beforeAll, test } from "bun:test";
        import { link } from "allure-js-commons";

        beforeAll(async () => {
          await link("https://example.org/from-hook", "From hook", "hook");
        });

        test("with fixture link", () => {});
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual({
      name: "From hook",
      type: "hook",
      url: "https://example.org/from-hook",
    });
  });
});
