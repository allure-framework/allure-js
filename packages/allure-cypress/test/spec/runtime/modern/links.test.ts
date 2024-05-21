import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runCypressInlineTest } from "../../../utils";

it("adds all the possible links", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCommonsModulePath }) => `
    import { link, issue, tms } from "${allureCommonsModulePath}";

    it("links", () => {
      link("https://allurereport.org", "foo", "bar");

      issue("https://allurereport.org/issues/1", "foo");
      issue("2", "bar");

      tms("https://allurereport.org/tasks/1", "foo");
      tms("2", "bar");
    });
    `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].links).toContainEqual({
    name: "bar",
    type: "foo",
    url: "https://allurereport.org",
  });
  expect(tests[0].links).toContainEqual({
    name: "foo",
    type: LinkType.ISSUE,
    url: "https://allurereport.org/issues/1",
  });
  expect(tests[0].links).toContainEqual({
    name: "bar",
    type: LinkType.ISSUE,
    url: "https://allurereport.org/issues/2",
  });
  expect(tests[0].links).toContainEqual({
    name: "foo",
    type: LinkType.TMS,
    url: "https://allurereport.org/tasks/1",
  });
  expect(tests[0].links).toContainEqual({
    name: "bar",
    type: LinkType.TMS,
    url: "https://allurereport.org/tasks/2",
  });
});
