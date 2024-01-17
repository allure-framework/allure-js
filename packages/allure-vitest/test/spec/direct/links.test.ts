import { LinkType } from "allure-js-commons";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

describe("links", () => {
  it("link", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { link } from "allure-vitest";

      test("link", async (t) => {
        await link(t, "foo", "https://example.org", "bar");
      });
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual({
      name: "bar",
      type: "foo",
      url: "https://example.org",
    });
  });

  it("issue", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { issue } from "allure-vitest";

      test("issue", async (t) => {
        await issue(t, "foo", "https://example.org/issue/1");
        await issue(t, "bar", "2");
      });
    `);

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
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";
      import { tms } from "allure-vitest";

      test("tms", async (t) => {
        await tms(t, "foo", "https://example.org/tms/1");
        await tms(t, "bar", "2");
      });
    `);

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
