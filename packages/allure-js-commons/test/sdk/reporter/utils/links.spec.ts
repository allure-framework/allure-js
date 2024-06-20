import { describe, expect, it } from "vitest";
import { LinkType } from "../../../../src/model.js";
import type { LinkConfig } from "../../../../src/sdk/reporter/types.js";
import { formatLinks } from "../../../../src/sdk/reporter/utils.js";

describe("formatLinks", () => {
  describe("with no templates", () => {
    it("shouldn't affect any link", () => {
      const links = [{ url: "foo" }, { url: "foo", name: "bar" }, { url: "foo", name: "bar", type: "baz" }];
      expect(formatLinks({}, links)).toEqual(links);
    });
  });

  describe("with a URL-only default link template", () => {
    const templates: LinkConfig = { [LinkType.DEFAULT]: { urlTemplate: "https://qux/%s" } };

    it("should affect the URL of a link with no type", () => {
      expect(formatLinks(templates, [{ url: "foo" }])).toEqual([{ url: "https://qux/foo" }]);
    });

    it("should affect the URL of a link with the default type", () => {
      expect(formatLinks(templates, [{ url: "foo", type: LinkType.DEFAULT }])).toEqual([
        { url: "https://qux/foo", type: LinkType.DEFAULT },
      ]);
    });

    it("should ignore links of other types", () => {
      const links = [
        { url: "foo", type: "bar" },
        { url: "bar", type: "quux" },
      ];
      expect(formatLinks(templates, links)).toEqual(links);
    });
  });

  describe("with URL and name templates", () => {
    const templates: LinkConfig = {
      qux: {
        urlTemplate: "https://qux/%s",
        nameTemplate: "qux-%s",
      },
    };

    it("should affect the name if not set", () => {
      expect(formatLinks(templates, [{ url: "foo", type: "qux" }])).toEqual([
        { url: "https://qux/foo", name: "qux-foo", type: "qux" },
      ]);
    });

    it("shouldn't affect the name if set", () => {
      expect(formatLinks(templates, [{ url: "foo", name: "bar", type: "qux" }])).toEqual([
        { url: "https://qux/foo", name: "bar", type: "qux" },
      ]);
    });

    it("should ignore links with a proper URL", () => {
      const links = [
        { url: "http://foo", type: "qux" },
        { url: "https://foo", type: "qux" },
        { url: "ftp://foo", type: "qux" },
        { url: "file:///foo", type: "qux" },
        { url: "customapp:custompath?foo=bar&baz=qux", type: "qux" },
      ];
      expect(formatLinks(templates, links)).toEqual(links);
    });
  });

  describe("with URL and name template functions", () => {
    const templates: LinkConfig = {
      qux: {
        urlTemplate: (v) => `https://qux/${v}`,
        nameTemplate: (v) => `qux-${v}`,
      },
    };

    it("should transform URLs and names with functions", () => {
      expect(formatLinks(templates, [{ url: "foo", type: "qux" }])).toEqual([
        { url: "https://qux/foo", name: "qux-foo", type: "qux" },
      ]);
    });
  });
});
