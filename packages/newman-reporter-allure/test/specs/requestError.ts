/* eslint-disable @typescript-eslint/quotes */
import { Status } from "allure-js-commons";
import { runNewman } from "./helpers/runNewman";
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("Mark test as failed when a request error occurs", async () => {
  const [result] = await runNewman({
    item: [
      {
        name: "testReq",
        event: [
          {
            listen: "test",
            script: {
              exec: [
                'pm.test("Status code is 200", function () {',
                "    pm.response.to.have.status(200);",
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
            path: ["timeout"],
          },
        },
        response: [],
      },
    ],
  });
  expect(result.status).toBe(Status.BROKEN);
  expect(result.parameters).toEqual([
    { name: "Request", value: "GET - http://example.com/timeout" },
  ]);
  expect(result.steps).toEqual([
    {
      status: "failed" as any,
      stage: "finished" as any,
      statusDetails: {},
      steps: [],
      attachments: [],
      parameters: [],
      name: "Status code is 200",
      start: expect.any(Number),
      stop: expect.any(Number),
    },
  ]);
  expect(result.statusDetails.message).toBe("Timeout");
});