import { expect, it } from "vitest";

import { check, runTestCafeInlineTest } from "../utils.js";

const PAGE_PATH = "/pages/testplan.html";

it("filters tests by selector", async () => {
  const { tests } = await runTestCafeInlineTest(
    {
      "pages/testplan.html": "<html><body><h1>Test plan</h1></body></html>",
      "plan.json": JSON.stringify({
        version: "1.0",
        tests: [
          { selector: "__TESTCAFE_SELECTOR__(tests/selector.test.js|Plan fixture|selected)" },
          { selector: "__TESTCAFE_PACKAGE_SELECTOR__(tests/selector.test.js|Plan fixture|selected)" },
        ],
      }),
      "tests/selector.test.js": `
        fixture\`Plan fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("selected", async t => {
          await t.expect(1).eql(1);
        });

        test("ignored", async t => {
          await t.expect(1).eql(1);
        });
      `,
    },
    {
      env: {
        ALLURE_TESTPLAN_PATH: "plan.json",
      },
      useTestPlanFilter: true,
    },
  );

  await check("verifies selector-based testplan filtering keeps only the selected test", () => {
    expect(tests).toEqual([
      expect.objectContaining({
        name: "selected",
        fullName: expect.stringMatching(/tests\/selector\.test\.js#Plan fixture#selected$/),
      }),
    ]);
  });
});

it("filters tests by allure id from test metadata", async () => {
  const { tests } = await runTestCafeInlineTest(
    {
      "pages/testplan.html": "<html><body><h1>Test plan</h1></body></html>",
      "plan.json": JSON.stringify({
        version: "1.0",
        tests: [{ id: "42" }],
      }),
      "tests/meta-id.test.js": `
        fixture\`Plan fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("selected by meta", async t => {
          await t.expect(1).eql(1);
        }).meta({
          "allure.id": "42",
        });

        test("ignored by meta", async t => {
          await t.expect(1).eql(1);
        }).meta({
          "allure.id": "24",
        });
      `,
    },
    {
      env: {
        ALLURE_TESTPLAN_PATH: "plan.json",
      },
      useTestPlanFilter: true,
    },
  );

  await check("verifies testplan filtering by allure id from metadata", () => {
    expect(tests).toEqual([
      expect.objectContaining({
        name: "selected by meta",
      }),
    ]);
  });
});

it("filters tests by allure id from title annotations", async () => {
  const { tests } = await runTestCafeInlineTest(
    {
      "pages/testplan.html": "<html><body><h1>Test plan</h1></body></html>",
      "plan.json": JSON.stringify({
        version: "1.0",
        tests: [{ id: "43" }],
      }),
      "tests/title-id.test.js": `
        fixture\`Plan fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("selected @allure.id=43", async t => {
          await t.expect(1).eql(1);
        });

        test("ignored @allure.id=44", async t => {
          await t.expect(1).eql(1);
        });
      `,
    },
    {
      env: {
        ALLURE_TESTPLAN_PATH: "plan.json",
      },
      useTestPlanFilter: true,
    },
  );

  await check("verifies testplan filtering by allure id from title annotations", () => {
    expect(tests).toEqual([
      expect.objectContaining({
        name: "selected",
      }),
    ]);
  });
});
