import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../utils.js";

it("applies templates to feature and scenario tag IDs and preserves absolute URLs", async () => {
  const { tests } = await runCucumberInlineTest(
    ["linkNameTemplates"],
    ["runtime/modern/links"],
    undefined,
    (reporterFilePath) => `
      module.exports = {
        default: {
          paths: ["./**/*.feature"],
          format: ["summary", "${reporterFilePath}"],
          formatOptions: {
            links: {
              issue: {
                pattern: [/@issue=(.*)/],
                urlTemplate: "https://example.com/issues/%s",
                nameTemplate: "Issue: %s",
              },
              tms: {
                pattern: [/@tms=(.*)/],
                urlTemplate: (id) => "https://example.com/tasks/" + id,
                nameTemplate: (id) => "TMS: " + id,
              },
              docs: {
                pattern: [/@docs=(.*)/],
                urlTemplate: () => { throw new Error("URL templates must not be called for absolute URLs"); },
                nameTemplate: () => { throw new Error("Name templates must not be called for absolute URLs"); },
              },
              plain: {
                pattern: [/@plain=(.*)/],
                urlTemplate: "https://example.com/plain/%s",
              },
              empty: {
                pattern: [/@empty=(.*)/],
                urlTemplate: "https://example.com/empty/%s",
                nameTemplate: "",
              },
            },
          },
        },
      };
    `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].links).toEqual([
    { type: "issue", url: "https://example.com/issues/FEATURE-1", name: "Issue: FEATURE-1" },
    { type: "issue", url: "https://example.com/issues/ABC-333", name: "Issue: ABC-333" },
    { type: "issue", url: "https://example.com/issues/ABS-1" },
    { type: "tms", url: "https://example.com/tasks/ABC-222", name: "TMS: ABC-222" },
    { type: "tms", url: "https://example.com/tasks/ABS-2" },
    { type: "docs", url: "https://example.com/guide" },
    { type: "plain", url: "https://example.com/plain/RAW-1" },
    { type: "empty", url: "https://example.com/empty/EMPTY-1", name: "" },
  ]);
});
