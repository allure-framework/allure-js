/* eslint  @typescript-eslint/no-require-imports: off */
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runJasmineInlineTest } from "../../../utils";

it("sets links", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { link, links, issue, tms } = require('allure-js-commons/');

      it("link", async () => {
        await link("https://allurereport.org");
        await issue("1");
        await issue("https://example.org/issues/2");
        await tms("1");
        await tms("https://example.org/tasks/2");
        await links(...[{ url:"https://allurereport.org/1" }, { url:"https://allurereport.org/2" }]);
      })
    `,
    "spec/helpers/allure.js": require(resolve(__dirname, "../../../fixtures/spec/helpers/legacy/allure.cjs")),
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual([
    expect.objectContaining({
      links: [
        {
          url: "https://allurereport.org",
        },
        {
          url: "https://example.org/issues/1",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.org/issues/2",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.org/tasks/1",
          type: LinkType.TMS,
        },
        {
          url: "https://example.org/tasks/2",
          type: LinkType.TMS,
        },
        {
          url: "https://allurereport.org/1",
        },
        {
          url: "https://allurereport.org/2",
        },
      ],
    }),
  ]);
});
