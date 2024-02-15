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
        allure.issue("http://example.org/issues/1", "foo");
        allure.issue("2", "bar");
        allure.issue("3");
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
    expect(tests[0].links).toContainEqual(
      expect.objectContaining({
        type: LinkType.ISSUE,
        url: "http://example.org/issues/3",
      }),
    );
  });

  it("tms", async () => {
    const { tests } = await runJestInlineTest(`
      it("tms", async () => {
        allure.tms("http://example.org/tasks/1", "foo");
        allure.tms("2", "bar");
        allure.tms("3");
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
    expect(tests[0].links).toContainEqual(
      expect.objectContaining({
        type: LinkType.TMS,
        url: "http://example.org/tasks/3",
      }),
    );
  });
});
