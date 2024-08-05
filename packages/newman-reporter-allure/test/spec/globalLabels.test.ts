/* eslint-disable @stylistic/quotes */
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("sets allure labels from env variables", async () => {
  const { tests } = await runNewmanCollection({
    info: {
      name: "fff",
    },
    item: [
      {
        name: "ParentName",
        item: [
          {
            name: "SuiteName",
            item: [
              {
                name: "SubSub1",
                item: [
                  {
                    name: "SubSub1",
                    item: [
                      {
                        name: "testReq",
                        event: [
                          {
                            listen: "test",
                            script: {
                              exec: [
                                "//@allure.id=228",
                                "//@allure.label.custom=test",
                                'pm.test("Status code is 200", function () {',
                                "    pm.response.to.have.status(200);",
                                "});",
                              ],
                              type: "text/javascript",
                            },
                          },
                        ],
                        request: {
                          description: "testDescription\n\nmultiline\n\n**somethingBold**",
                          method: "GET",
                          header: [],
                          url: {
                            host: ["example", "com"],
                            path: ["test"],
                            query: [
                              {
                                key: "dfgdfg",
                                value: null,
                              },
                            ],
                          },
                        },
                        response: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: "A", value: "a" },
      { name: "B", value: "b" },
    ]),
  );
});
