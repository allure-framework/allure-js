import { describe, expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runVitestInlineTest } from "../../../utils.js";

describe("links", () => {
  it("link", async () => {
    const { tests } = await runVitestInlineTest(
      `
      import { test } from "vitest";
      import { link } from "allure-js-commons";

      test("link", async (t) => {
        await link("https://example.org", "foo", "bar");
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
      import { issue } from "allure-js-commons";

      test("issue", async () => {
        await issue("https://example.org/issue/1", "foo");
        await issue("2", "bar");
      });
      `,
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
      import { tms } from "allure-js-commons";

      test("tms", async () => {
        await tms("https://example.org/tms/1", "foo");
        await tms("2", "bar");
      });
      `,
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
