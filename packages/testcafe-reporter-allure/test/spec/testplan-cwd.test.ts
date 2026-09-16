import { expect, it } from "vitest";

import { check, runTestCafeInlineTest } from "../utils.js";

const PAGE_PATH = "/pages/testplan.html";

it("resolves relative testplan paths from a nested project cwd and deselects before execution", async () => {
  const { tests } = await runTestCafeInlineTest(
    {
      "workspace/pages/testplan.html": "<html><body><h1>Nested Test plan</h1></body></html>",
      "workspace/plans/plan.json": JSON.stringify({
        version: "1.0",
        tests: [
          { selector: "__TESTCAFE_SELECTOR__(workspace/tests/nested.test.js|Plan fixture|selected nested)" },
          { selector: "__TESTCAFE_PACKAGE_SELECTOR__(workspace/tests/nested.test.js|Plan fixture|selected nested)" },
        ],
      }),
      "workspace/tests/nested.test.js": `
        const fs = require("node:fs");
        const path = require("node:path");

        fixture\`Plan fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}/workspace${PAGE_PATH}\`;

        test("selected nested", async t => {
          await t.expect(1).eql(1);
        });

        test("must stay deselected", async () => {
          fs.writeFileSync(path.join(process.cwd(), "unexpected-run.txt"), "ran", "utf8");
          throw new Error("deselected test executed");
        });
      `,
    },
    {
      env: {
        ALLURE_TESTPLAN_PATH: "plans/plan.json",
      },
      projectCwdRelative: "workspace",
      useTestPlanFilter: true,
    },
  );

  await check("verifies nested project CWD resolution and pre-execution deselection", () => {
    expect(tests).toEqual([
      expect.objectContaining({
        name: "selected nested",
        fullName: expect.stringMatching(/tests\/nested\.test\.js#Plan fixture#selected nested$/),
      }),
    ]);
  });
});
