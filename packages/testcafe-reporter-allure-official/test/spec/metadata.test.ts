import { LabelName, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { check, runTestCafeInlineTest } from "../utils.js";

const PAGE_PATH = "/pages/metadata.html";

it("merges fixture metadata, test metadata, and title annotations", async () => {
  const { tests } = await runTestCafeInlineTest(
    {
      "pages/metadata.html": "<html><body><h1>Metadata</h1></body></html>",
      "tests/metadata.test.js": `
        fixture\`Meta fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`
          .meta({
            owner: "fixture-owner",
            component: "fixture-component",
            "allure.id": "100",
            "allure.label.epic": "Authentication",
            "allure.label.tag": ["ui", "smoke"],
            "allure.link.issue": "AUTH-1",
          });

        test("annotated @allure.id=300 @allure.label.story=Login @allure.link.tms=TMS-9", async t => {
          await t.expect(1).eql(1);
        }).meta({
          owner: "test-owner",
          component: "sign-in",
          "allure.id": "200",
          "allure.label.feature": "Password login",
          "allure.link.issue": ["AUTH-2", "AUTH-3"],
        });
      `,
    },
    {
      reporterConfig: {
        links: {
          issue: {
            urlTemplate: "https://issues.example/%s",
            nameTemplate: "ISSUE-%s",
          },
          tms: {
            urlTemplate: "https://tms.example/%s",
            nameTemplate: "TMS-%s",
          },
        },
      },
    },
  );

  const [testResult] = tests;

  await check("verifies fixture metadata, test metadata, and title annotations are merged correctly", () => {
    expect(tests).toHaveLength(1);
    expect(testResult).toEqual(
      expect.objectContaining({
        name: "annotated",
        fullName: expect.stringMatching(/tests\/metadata\.test\.js#Meta fixture#annotated$/),
        titlePath: [expect.stringMatching(/tests\/metadata\.test\.js$/), "Meta fixture"],
        status: Status.PASSED,
        labels: expect.arrayContaining([
          { name: LabelName.ALLURE_ID, value: "200" },
          { name: LabelName.EPIC, value: "Authentication" },
          { name: LabelName.FEATURE, value: "Password login" },
          { name: LabelName.STORY, value: "Login" },
          { name: LabelName.TAG, value: "ui" },
          { name: LabelName.TAG, value: "smoke" },
        ]),
        links: expect.arrayContaining([
          { type: "issue", url: "https://issues.example/AUTH-2", name: "ISSUE-AUTH-2" },
          { type: "issue", url: "https://issues.example/AUTH-3", name: "ISSUE-AUTH-3" },
          { type: "tms", url: "https://tms.example/TMS-9", name: "TMS-TMS-9" },
        ]),
        parameters: expect.arrayContaining([
          expect.objectContaining({ name: "owner", value: "test-owner" }),
          expect.objectContaining({ name: "component", value: "sign-in" }),
        ]),
      }),
    );
  });

  await check("verifies overridden links replace fixture-level duplicates", () => {
    expect(testResult.links).not.toContainEqual(expect.objectContaining({ url: "https://issues.example/AUTH-1" }));
  });
});
