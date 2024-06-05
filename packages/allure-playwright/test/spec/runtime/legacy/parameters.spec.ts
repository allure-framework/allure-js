import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets parameters", async () => {
  const { tests } = await runPlaywrightInlineTest(
    {
      "sample.test.js": `
       import { test, expect, allure } from "allure-playwright";

       test('should add epic label', async ({}) => {
        await allure.parameter("param1", "paramValue1");
        await allure.parameter("param2", "paramValue2", {excluded:true});
        await allure.parameter("param3", "paramValue3", {mode:"masked", excluded:true});
        await allure.parameter("param4", "paramValue4", {mode:"hidden"});
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
