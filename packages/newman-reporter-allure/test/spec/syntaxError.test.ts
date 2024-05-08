/* eslint-disable @typescript-eslint/quotes */
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { Stage, Status } from "allure-js-commons/new/sdk/node";
import { server } from "../mocks/server";
import { runNewmanCollection } from "../utils";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("verify postman assertion error", async () => {
  const { tests } = await runNewmanCollection({
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

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      statusDetails: {
        message: "SyntaxError",
        trace: expect.any(String),
      },
      steps: expect.arrayContaining([
        expect.objectContaining({
          statusDetails: {
            message: "missing ) after argument list",
          },
        }),
      ]),
    }),
  );
});
