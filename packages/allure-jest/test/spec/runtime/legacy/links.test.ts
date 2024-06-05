import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runJestInlineTest } from "../../../utils.js";

it("sets links", async () => {
  const { tests } = await runJestInlineTest(`
      it("link", async () => {
        await allure.link("https://allurereport.org");
        await allure.issue("1");
        await allure.issue("https://example.org/issues/2");
        await allure.tms("1");
        await allure.tms("https://example.org/tasks/2");
        await allure.links(...[{ url:"https://allurereport.org/1" }, { url:"https://allurereport.org/2" }]);
      })
    `);

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
