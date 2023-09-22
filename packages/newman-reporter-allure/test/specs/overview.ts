/* eslint-disable @typescript-eslint/quotes */
import { LabelName, md5, Status } from "allure-js-commons";
import { expect } from "expect";
import { after, afterEach, before, test } from "mocha";
import { runNewman } from "../helpers/runNewman";
import { server } from "../mocks/server";

before(() => server.listen());
afterEach(() => server.resetHandlers());
after(() => server.close());

test("complex test overview", async () => {
  const [result] = await runNewman({
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
  const name = "testReq";
  const fullName = `ParentName/SuiteName/SubSub1/SubSub1#${name}`;

  expect(result.status).toBe(Status.PASSED);
  expect(result.name).toBe(name);

  expect(result.parameters).toHaveLength(2);
  expect(result.parameters).toEqual([
    {
      name: "Request",
      value: "GET - http://example.com/test?dfgdfg",
    },
    {
      excluded: true,
      name: "Response Code",
      value: "200",
    },
  ]);
  expect(result.steps).toHaveLength(1);
  expect(result.steps[0]).toMatchObject({
    status: "passed" as any,
    stage: "finished" as any,
    statusDetails: {},
    steps: [],
    attachments: [],
    parameters: [],
    name: "Status code is 200",
  });
  expect(result.descriptionHtml).toBe("testDescription<br><br>multiline<br><br>somethingBold");
  expect(result.labels).toEqual([
    { name: "parentSuite", value: "ParentName" },
    { name: "suite", value: "SuiteName" },
    { name: "subSuite", value: "SubSub1 > SubSub1" },
    { name: LabelName.ALLURE_ID, value: "228" },
    { name: "custom", value: "test" },
  ]);
  expect(result.fullName).toEqual(fullName);
  expect(result.testCaseId).toEqual(md5(fullName));
});
