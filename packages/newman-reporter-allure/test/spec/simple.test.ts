/* eslint-disable @typescript-eslint/quotes */
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { LabelName, Stage, Status } from "allure-js-commons";
import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("complex test overview", async () => {
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
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "testReq",
      fullName: "ParentName/SuiteName/SubSub1/SubSub1#testReq",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      description: "testDescription\n\nmultiline\n\n**somethingBold**",
      descriptionHtml: "testDescription<br><br>multiline<br><br>somethingBold",
      historyId: expect.any(String),
      testCaseId: expect.any(String),
      labels: expect.arrayContaining([
        { name: LabelName.PARENT_SUITE, value: "ParentName" },
        { name: LabelName.SUITE, value: "SuiteName" },
        { name: LabelName.SUB_SUITE, value: "SubSub1 > SubSub1" },
        { name: LabelName.ALLURE_ID, value: "228" },
        { name: "custom", value: "test" },
      ]),
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: "Request", value: "GET - http://example.com/test?dfgdfg" }),
        expect.objectContaining({ name: "Response Code", value: "200", excluded: true }),
      ]),
      steps: [
        expect.objectContaining({
          name: "Status code is 200",
          status: Status.PASSED,
          stage: "finished",
          statusDetails: {},
          steps: [],
          attachments: [],
          parameters: [],
        }),
      ],
    }),
  );
});
