import { expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils";

it("sets parameters", async () => {
  const { tests } = await runJestInlineTest(`
      const { parameter } = require("allure-js-commons");

      it("parameter", async () => {
        await parameter("param1", "paramValue1");
        await parameter("param2", "paramValue2", {excluded:true});
        await parameter("param3", "paramValue3", {mode:"masked", excluded:true});
        await parameter("param4", "paramValue4", {mode:"hidden"});
      })
    `);

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
