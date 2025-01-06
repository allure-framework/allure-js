/* eslint-disable @stylistic/quotes */
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";
import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it("should include port number into request yrl", async () => {
  const { tests } = await runNewmanCollection({
    item: [
      {
        name: "Port Test Request",
        event: [
          {
            listen: "test",
            script: {
              exec: ['pm.test("Response Code", function () {\r', "    pm.response.to.have.status(200);", "});"],
              type: "text/javascript",
            },
          },
        ],
        request: {
          method: "GET",
          url: {
            host: ["example", "com"],
            port: "9999",
            path: ["port"],
          },
        },
        response: [],
      },
    ],
  });

  expect(tests).toHaveLength(1);
  const [test] = tests;

  expect(test.parameters).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "Request", value: "GET - http://example.com:9999/port" })]),
  );
});
