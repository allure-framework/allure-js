import { describe, expect, it } from "@jest/globals";
import { LinkType } from "allure-js-commons";
import { runJestInlineTest } from "../utils";

describe("links", () => {
  it("link", async () => {
    const { tests } = await runJestInlineTest(`
      it("link", async () => {
        allure.link("http://example.org", "bar", "foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual(
      expect.objectContaining({
        type: "foo",
        name: "bar",
        url: "http://example.org",
      }),
    );
  });

  it("issue", async () => {
    const { tests } = await runJestInlineTest(`
      it("issue", async () => {
        allure.issue("foo", "http://example.org/issues/1");
        allure.issue("bar", "2");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual(
      expect.objectContaining({
        type: LinkType.ISSUE,
        name: "foo",
        url: "http://example.org/issues/1",
      }),
    );
    expect(tests[0].links).toContainEqual(
      expect.objectContaining({
        type: LinkType.ISSUE,
        name: "bar",
        url: "http://example.org/issues/2",
      }),
    );
  });

  it("tms", async () => {
    const { tests } = await runJestInlineTest(`
      it("tms", async () => {
        allure.tms("foo", "http://example.org/tasks/1");
        allure.tms("bar", "2");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].links).toContainEqual(
      expect.objectContaining({
        type: LinkType.TMS,
        name: "foo",
        url: "http://example.org/tasks/1",
      }),
    );
    expect(tests[0].links).toContainEqual(
      expect.objectContaining({
        type: LinkType.TMS,
        name: "bar",
        url: "http://example.org/tasks/2",
      }),
    );
  });
});
