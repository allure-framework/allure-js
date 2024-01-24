import { describe, expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runVitestInlineTest } from "../../utils.js";

describe("links", () => {
  it("link", async () => {
    const { tests } = await runVitestInlineTest(
      `
      import { test } from "vitest";

      test("link", async (t) => {
        await allure.link("foo", "https://example.org", "bar");
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
        await allure.issue("foo", "https://example.org/issue/1");
        await allure.issue("bar", "2");
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

      test("tms", async () => {
        await allure.tms("foo", "https://example.org/tms/1");
        await allure.tms("bar", "2");
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
