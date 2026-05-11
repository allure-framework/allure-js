import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets parameters through the sync facade", async () => {
  const { tests } = await runPlaywrightInlineTest(
    {
      "sample.test.js": `
       import { test } from "@playwright/test";
       import { parameter } from "allure-js-commons/sync";

       test("should add parameters", async () => {
        parameter("param1", "paramValue1");
        parameter("param2", "paramValue2", { excluded: true });
        parameter("param3", "paramValue3", { mode: "masked", excluded: true });
        parameter("param4", "paramValue4", { mode: "hidden" });
       });
     `,
    },
    ["--repeat-each", "2"],
  );

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        parameters: [
          { name: "Project", value: "project" },
          { name: "Repetition", value: "1" },
          { name: "param1", value: "paramValue1" },
          { excluded: true, name: "param2", value: "paramValue2" },
          { excluded: true, mode: "masked", name: "param3", value: "paramValue3" },
          { mode: "hidden", name: "param4", value: "paramValue4" },
        ],
      }),
      expect.objectContaining({
        parameters: [
          { name: "Project", value: "project" },
          { name: "Repetition", value: "2" },
          { name: "param1", value: "paramValue1" },
          { excluded: true, name: "param2", value: "paramValue2" },
          { excluded: true, mode: "masked", name: "param3", value: "paramValue3" },
          { mode: "hidden", name: "param4", value: "paramValue4" },
        ],
      }),
    ]),
  );
});
