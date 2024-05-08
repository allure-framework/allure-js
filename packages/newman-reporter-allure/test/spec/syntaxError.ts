/* eslint-disable @typescript-eslint/quotes */
import { expect } from "expect";
import { after, afterEach, before, test } from "mocha";
import { runNewman } from "../helpers/runNewman";
import { server } from "../mocks/server";

before(() => server.listen());
afterEach(() => server.resetHandlers());
after(() => server.close());

test("Verify postman assertion error", async () => {
  const [result] = await runNewman({
    item: [
      {
        name: "Syntax Error Test Request",
        event: [
          {
            listen: "test",
            script: {
              exec: [
                'pm.test("Döner", function () {\r',
                '    const x = "vegi"\r',
                '    pm.expect(x).to.have.property("ohnemett");\r',
                "};",
              ],
              type: "text/javascript",
            },
          },
        ],
        request: {
          method: "GET",
          header: [],
          url: {
            host: ["example", "com"],
            path: ["test"],
          },
        },
        response: [],
      },
    ],
  });
  expect(result.statusDetails.message).toEqual("SyntaxError");
  expect(result.steps[0].name).toEqual("SyntaxError");
  expect(result.steps[0].statusDetails.message).toEqual("missing ) after argument list");
});
