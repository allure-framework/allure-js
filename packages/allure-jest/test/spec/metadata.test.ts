import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("should add labels from embedded metadata", async () => {
  const { tests } = await runJestInlineTest({
    "spec/test/sample.spec.js": `
      it("foo @allure.id:1004 @allure.label.bar=baz", () => {});
    `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "foo",
      fullName: "allure-jest:spec/test/sample.spec.js#foo",
      status: Status.PASSED,
      labels: expect.arrayContaining([
        {
          name: "ALLURE_ID",
          value: "1004",
        },
        {
          name: "bar",
          value: "baz",
        },
      ]),
    }),
  ]);
});

it("should add links from embedded metadata", async () => {
  const { tests } = await runJestInlineTest({
    "spec/test/sample.spec.js": `
      it("foo @allure.link.bar=https://allurereport.org", () => {});
    `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "foo",
      fullName: "allure-jest:spec/test/sample.spec.js#foo",
      status: Status.PASSED,
      links: expect.arrayContaining([
        {
          type: "bar",
          url: "https://allurereport.org",
        },
      ]),
    }),
  ]);
});
