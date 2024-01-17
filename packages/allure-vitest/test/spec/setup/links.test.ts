import { LinkType } from "allure-js-commons";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

describe("links", () => {
  it("link", async () => {
    const { tests } = await runVitestInlineTest(`
      import { test } from "vitest";

      test("link", () => {
        this.allure.link("foo", "https://example.org", "bar");
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

      test("issue", () => {
        this.allure.issue("foo", "https://example.org/issue/1");
        this.allure.issue("bar", "2");
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

      test("tms", () => {
        this.allure.tms("foo", "https://example.org/tms/1");
        this.allure.tms("bar", "2");
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
