/* eslint-disable @typescript-eslint/quotes */
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
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
              exec: ['pm.test("Status code is 200", function () {', "    pm.response.to.have.status(200);", "});"],
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

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      statusDetails: {
        message: "Timeout",
      },
      steps: [
        {
          status: "failed" as any,
          stage: "finished" as any,
          statusDetails: expect.any(Object),
          steps: [],
          attachments: [],
          parameters: [],
          name: "Status code is 200",
          start: expect.any(Number),
          stop: expect.any(Number),
        },
      ],
    }),
  );
});
