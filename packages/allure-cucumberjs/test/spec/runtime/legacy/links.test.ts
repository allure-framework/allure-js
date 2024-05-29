import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runCucumberInlineTest } from "../../../utils";

it("handles runtime links", async () => {
  const { tests } = await runCucumberInlineTest(["links"], ["runtime/legacy/links"], false);

  expect(tests).toHaveLength(5);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "a",
      links: expect.arrayContaining([
        {
          url: "https://example.com/issues/0",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.com/issues/1",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.com/tasks/2",
          type: LinkType.TMS,
        },
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "b",
      links: expect.arrayContaining([
        {
          url: "https://example.com/issues/0",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.com/issues/3",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.com/tasks/4",
          type: LinkType.TMS,
        },
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "runtime links",
      links: expect.arrayContaining([
        {
          url: "https://example.com/issues/0",
          type: LinkType.ISSUE,
        },
        {
          name: "Custom link",
          url: "https://example.com",
          type: "custom",
        },
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "runtime issue links",
      links: expect.arrayContaining([
        {
          url: "https://example.com/issues/0",
          type: LinkType.ISSUE,
        },
        {
          name: "Custom issue 1",
          url: "https://example.com/issues/1",
          type: LinkType.ISSUE,
        },
        {
          name: "Custom issue 2",
          url: "https://example.com/issues/2",
          type: LinkType.ISSUE,
        },
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "runtime tms links",
      links: expect.arrayContaining([
        {
          url: "https://example.com/issues/0",
          type: LinkType.ISSUE,
        },
        {
          name: "Custom task 1",
          url: "https://example.com/tasks/1",
          type: LinkType.TMS,
        },
        {
          name: "Custom task 2",
          url: "https://example.com/tasks/2",
          type: LinkType.TMS,
        },
      ]),
    }),
  );
});
