/* eslint-disable @typescript-eslint/quotes */
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { Stage, Status } from "allure-js-commons/new/sdk/node";
import { server } from "../mocks/server";
import { runNewmanCollection } from "../utils";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("mark test as failed when a request error occurs", async () => {
  const { tests } = await runNewmanCollection({
    item: [
      {
        name: "testReq",
        event: [
          {
            listen: "test",
            script: {
              exec: [
                'pm.test("Текст проверки на русском(она должна зафейлится)", function () {',
                "    pm.response.to.have.status(555);",
                "});",
                'pm.test("(Turkish name) Türkçe metni kontrol et", function () {',
                "    pm.response.to.have.status(666);",
                "});",
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
        message: "Текст проверки на русском(она должна зафейлится), (Turkish name) Türkçe metni kontrol et",
        trace: expect.any(String),
      },
      steps: [
        expect.objectContaining({
          statusDetails: {
            message: "expected response to have status code 555 but got 200",
            trace: expect.stringContaining("AssertionError: expected response to have status code 555 but got 200"),
          },
        }),
        expect.objectContaining({
          statusDetails: {
            message: "expected response to have status code 666 but got 200",
            trace: expect.stringContaining("AssertionError: expected response to have status code 666 but got 200"),
          },
        }),
      ],
    }),
  );
});
