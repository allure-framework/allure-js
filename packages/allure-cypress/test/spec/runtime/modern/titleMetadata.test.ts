import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCypressInlineTest } from "../../../utils.js";

it("title metadata", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCommonsModulePath }) => `
    import { label } from "${allureCommonsModulePath}";

    it("foo @allure.id=1 @allure.label.foo=2", () => {
      label("bar", "3");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(
    expect.objectContaining({
      name: LabelName.ALLURE_ID,
      value: "1",
    }),
  );
  expect(tests[0].labels).toContainEqual(
    expect.objectContaining({
      name: "foo",
      value: "2",
    }),
  );
  expect(tests[0].labels).toContainEqual(
    expect.objectContaining({
      name: "bar",
      value: "3",
    }),
  );
});
