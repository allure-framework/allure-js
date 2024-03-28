import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runCypressInlineTest } from "../utils";

it("link", async () => {
  const { tests } = await runCypressInlineTest(
    `
    import { link } from "allure-cypress";

    it("link", () => {
      link("https://allurereport.org", "bar", "foo");
    });
    `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].links).toContainEqual({
    name: "bar",
    type: "foo",
    url: "https://allurereport.org",
  });
});

it("issue", async () => {
  const { tests } = await runCypressInlineTest(
    `
    import { issue } from "allure-cypress";

    it("issue", () => {
      issue("https://allurereport.org/issues/1", "foo");
      issue("2", "bar");
    });
    `,
  );

  expect(tests).toHaveLength(1);
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
});

it("tms", async () => {
  const { tests } = await runCypressInlineTest(
    `
    import { tms } from "allure-cypress";

    it("tms", () => {
      tms("https://allurereport.org/tasks/1", "foo");
      tms("2", "bar");
    });
    `,
  );

  expect(tests).toHaveLength(1);
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
