/* eslint-disable @typescript-eslint/quotes */
import { expect } from "expect";
import { after, afterEach, before, test } from "mocha";
import { runNewman } from "../helpers/runNewman";
import { server } from "../mocks/server";

before(() => server.listen());
afterEach(() => server.resetHandlers());
after(() => server.close());

test("Verify Headers", async () => {
  const [result] = await runNewman({
    item: [
      {
        name: "Header Test Request",
        event: [
          {
            listen: "test",
            script: {
              exec: [
                'pm.test("Kebap", function () {\r',
                '    const x = "vegi dohwap mett"\r',
                '    pm.expect(x).to.contain("dohwap");\r',
                "});",
                'pm.test("Response Code", function () {\r',
                "    pm.response.to.have.status(200);",
                "});",
              ],
              type: "text/javascript",
            },
          },
        ],
        request: {
          method: "GET",
          header: [
            {
              key: "A-Header",
              value: "with some value",
            },
            {
              key: "B-Header",
              value: "with other value",
            },
          ],
          body: {
            mode: "raw",
            raw: '{\r\n    testVal1: "body",\r\n    testVal2: 1,\r\n    testVal3: true,\r\n}',
          },
          url: {
            host: ["example", "com"],
            path: ["headers"],
          },
        },
        response: [],
      },
    ],
  });

  expect(result.attachments).toEqual([
    {
      name: "TestScript",
      source: expect.stringContaining("attachment.txt"),
      type: "text/plain",
    },
    {
      name: "Request Headers",
      source: expect.stringContaining("attachment.txt"),
      type: "text/plain",
    },
    {
      name: "Request Body",
      source: expect.stringContaining("attachment.txt"),
      type: "text/plain",
    },
    {
      name: "Response Headers",
      source: expect.stringContaining("attachment.txt"),
      type: "text/plain",
    },
    {
      name: "Response Body",
      source: expect.stringContaining("attachment.txt"),
      type: "text/plain",
    },
  ]);
});
