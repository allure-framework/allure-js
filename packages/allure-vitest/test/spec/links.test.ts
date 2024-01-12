import { LinkType } from "allure-js-commons";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("links", () => {
  it("link", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("link", ({ allure }) => {
        allure.link("https://example.org", "foo", "bar");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].links).toContainEqual({
      name: "foo",
      type: "bar",
      url: "https://example.org",
    });
  });

  it("issue", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("issue", ({ allure }) => {
        allure.issue("foo", "https://example.org/issue/1");
        allure.issue("bar", "2");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].links).toContainEqual({
      name: "foo",
      type: LinkType.ISSUE,
      url: "https://example.org/issue/1",
    });
    expect(results[0].links).toContainEqual({
      name: "bar",
      type: LinkType.ISSUE,
      url: "https://example.org/issue/2",
    });
  });

  it("tms", async () => {
    const { results } = await runVitestInlineTest(`
      import { allureTest } from "allure-vitest/test";

      allureTest("tms", ({ allure }) => {
        allure.tms("foo", "https://example.org/tms/1");
        allure.tms("bar", "2");
      });
    `);

    expect(results).toHaveLength(1);
    expect(results[0].links).toContainEqual({
      name: "foo",
      type: LinkType.TMS,
      url: "https://example.org/tms/1",
    });
    expect(results[0].links).toContainEqual({
      name: "bar",
      type: LinkType.TMS,
      url: "https://example.org/tms/2",
    });
  });
});
