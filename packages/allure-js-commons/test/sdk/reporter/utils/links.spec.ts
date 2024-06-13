import { describe, expect, it } from "vitest";
import { LinkType } from "../../../../src/model.js";
import { formatLinks } from "../../../../src/sdk/reporter/utils.js";

describe("formatLinks", () => {
  describe("with no patterns", () => {
    it("shouldn't affect any link", () => {
      const links = [{ url: "foo" }, { url: "foo", name: "bar" }, { url: "foo", name: "bar", type: "baz" }];
      expect(formatLinks({}, links)).toEqual(links);
    });
  });

  describe("with the URL-only default link pattern", () => {
    const patterns = { [LinkType.DEFAULT]: { urlTemplate: "https://qux/%s" } };

    it("should affect the URL of a link with no type specified", () => {
      expect(formatLinks(patterns, [{ url: "foo" }])).toEqual([{ url: "https://qux/foo" }]);
    });

    it("should affect the URL of a link with the explicit default type", () => {
      expect(formatLinks(patterns, [{ url: "foo", type: LinkType.DEFAULT }])).toEqual([
        { url: "https://qux/foo", type: LinkType.DEFAULT },
      ]);
    });

    it("should ignore links of other types", () => {
      const links = [
        { url: "foo", type: "bar" },
        { url: "bar", type: "quux" },
      ];
      expect(formatLinks(patterns, links)).toEqual(links);
    });
  });

  describe("with the URL and name pattern", () => {
    const patterns = {
      qux: {
        urlTemplate: "https://qux/%s",
        nameTemplate: "qux-%s",
      },
    };

    it("should affect the name if not set", () => {
      expect(formatLinks(patterns, [{ url: "foo", type: "qux" }])).toEqual([
        { url: "https://qux/foo", name: "qux-foo", type: "qux" },
      ]);
    });

    it("shouldn't affect the name if set", () => {
      expect(formatLinks(patterns, [{ url: "foo", name: "bar", type: "qux" }])).toEqual([
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
      expect(formatLinks(patterns, links)).toEqual(links);
    });
  });
});
