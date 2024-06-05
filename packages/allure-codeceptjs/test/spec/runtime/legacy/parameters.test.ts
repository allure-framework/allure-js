import { expect, it } from "vitest";
import { runCodeceptJsInlineTest } from "../../../utils.js";

it("sets parameters", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "sample.test.js": `
      Feature("login-feature");
      Scenario("login-scenario1", async () => {
        const allure = codeceptjs.container.plugins("allure");

        await allure.parameter("param1", "paramValue1");
        await allure.parameter("param2", "paramValue2", {excluded:true});
        await allure.parameter("param3", "paramValue3", {mode:"masked", excluded:true});
        await allure.parameter("param4", "paramValue4", {mode:"hidden"});
       });
     `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        parameters: [
          { name: "param1", value: "paramValue1" },
          { excluded: true, name: "param2", value: "paramValue2" },
          { excluded: true, mode: "masked", name: "param3", value: "paramValue3" },
          { mode: "hidden", name: "param4", value: "paramValue4" },
        ],
      }),
      expect.objectContaining({
        parameters: [
          { name: "param1", value: "paramValue1" },
          { excluded: true, name: "param2", value: "paramValue2" },
          { excluded: true, mode: "masked", name: "param3", value: "paramValue3" },
          { mode: "hidden", name: "param4", value: "paramValue4" },
        ],
      }),
    ]),
  );
});
