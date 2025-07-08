import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { LabelName, Stage, Status } from "allure-js-commons";
import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const collection = {
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
                              "//@allure.link.my_link=https://allurereport.org",
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
};

test("complex test overview", async () => {
  const { tests } = await runNewmanCollection(collection);

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "testReq",
      fullName: "fff/ParentName/SuiteName/SubSub1/SubSub1#testReq",
      titlePath: ["fff", "ParentName", "SuiteName", "SubSub1", "SubSub1"],
      status: Status.PASSED,
      stage: Stage.FINISHED,
      description: "testDescription\n\nmultiline\n\n**somethingBold**",
      descriptionHtml: "testDescription<br><br>multiline<br><br>somethingBold",
      historyId: expect.any(String),
      testCaseId: expect.any(String),
      labels: expect.arrayContaining([
        { name: LabelName.PARENT_SUITE, value: "fff" },
        { name: LabelName.SUITE, value: "ParentName" },
        { name: LabelName.SUB_SUITE, value: "SuiteName > SubSub1 > SubSub1" },
        { name: LabelName.ALLURE_ID, value: "228" },
        { name: "custom", value: "test" },
      ]),
      links: expect.arrayContaining([{ type: "my_link", url: "https://allurereport.org" }]),
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
