import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test.each([
  { listen: "test", attachmentName: "TestScript" },
  { listen: "prerequest", attachmentName: "PreRequest" },
])("attaches all $listen scripts in execution order for each request", async ({ listen, attachmentName }) => {
  const collectionScript = 'pm.test("collection", function () { pm.expect(true).to.be.true; });';
  const folderScript = 'pm.test("folder", function () { pm.expect(true).to.be.true; });';
  const nestedFolderScript = 'pm.test("nested folder", function () { pm.expect(true).to.be.true; });';
  const requestScripts = [
    'pm.test("first request", function () { pm.expect(true).to.be.true; });',
    'pm.test("second request", function () { pm.expect(true).to.be.true; });',
  ];
  const { tests, attachments } = await runNewmanCollection({
    event: [{ listen, script: { exec: [collectionScript] } }],
    item: [
      {
        name: "folder",
        event: [{ listen, script: { exec: [folderScript] } }],
        item: [
          {
            name: "nested folder",
            event: [{ listen, script: { exec: [nestedFolderScript] } }],
            item: requestScripts.map((requestScript, index) => ({
              name: `request ${index + 1}`,
              request: { method: "GET", url: "http://example.com/test" },
              event: [{ listen, script: { exec: [requestScript] } }],
            })),
          },
        ],
      },
    ],
  });

  expect(tests).toHaveLength(2);
  for (const [index, result] of tests.entries()) {
    expect(result.status).toBe("passed");
    expect(result.steps.map(({ name, status }) => ({ name, status }))).toEqual([
      { name: "collection", status: "passed" },
      { name: "folder", status: "passed" },
      { name: "nested folder", status: "passed" },
      { name: index === 0 ? "first request" : "second request", status: "passed" },
    ]);
    const scripts = result.attachments.filter(({ name }) => name === attachmentName);
    expect(scripts).toHaveLength(1);
    expect(Buffer.from(attachments[scripts[0].source].toString(), "base64").toString()).toBe(
      [collectionScript, folderScript, nestedFolderScript, requestScripts[index]].join("\n\n"),
    );
  }
});

test.each([
  { listen: "test", attachmentName: "TestScript" },
  { listen: "prerequest", attachmentName: "PreRequest" },
])("attaches the request $listen script after an empty collection script", async ({ listen, attachmentName }) => {
  const requestScript = 'pm.test("request", function () { pm.expect(true).to.be.true; });';
  const { tests, attachments } = await runNewmanCollection({
    event: [{ listen, script: { exec: [""] } }],
    item: [
      {
        name: "request",
        request: { method: "GET", url: "http://example.com/test" },
        event: [{ listen, script: { exec: [requestScript] } }],
      },
    ],
  });

  expect(tests).toHaveLength(1);
  const scripts = tests[0].attachments.filter(({ name }) => name === attachmentName);
  expect(scripts).toHaveLength(1);
  expect(Buffer.from(attachments[scripts[0].source].toString(), "base64").toString()).toBe(requestScript);
});

test.each(["test", "prerequest"])(
  "reports errors from all %s scripts after a successful collection script",
  async (listen) => {
    const { tests } = await runNewmanCollection({
      event: [{ listen, script: { exec: ['pm.test("collection", function () { pm.expect(true).to.be.true; });'] } }],
      item: [
        {
          name: "folder",
          event: [{ listen, script: { exec: ['throw new TypeError("folder error");'] } }],
          item: [
            {
              name: "request",
              request: { method: "GET", url: "http://example.com/test" },
              event: [{ listen, script: { exec: ['throw new Error("request error");'] } }],
            },
          ],
        },
      ],
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].status).toBe("broken");
    expect(tests[0].statusDetails).toEqual({
      message: "TypeError: folder error, Error: request error",
      trace: "Response code: 200, status: OK",
    });
    expect(tests[0].steps).toEqual([
      expect.objectContaining({ name: "collection", status: "passed" }),
      expect.objectContaining({ name: "TypeError", status: "broken", statusDetails: { message: "folder error" } }),
      expect.objectContaining({ name: "Error", status: "broken", statusDetails: { message: "request error" } }),
    ]);
  },
);

test.each(["test", "prerequest"])("classifies a top-level assertion in a %s script as failed", async (listen) => {
  const { tests } = await runNewmanCollection({
    item: [
      {
        name: "request",
        request: { method: "GET", url: "http://example.com/test" },
        event: [{ listen, script: { exec: ["pm.expect(1).to.eql(2);"] } }],
      },
    ],
  });
  expect(tests[0].status).toBe("failed");
  expect(tests[0].statusDetails.message).toBe("AssertionError: expected 1 to deeply equal 2");
  expect(tests[0].steps).toEqual([
    expect.objectContaining({
      name: "AssertionError",
      status: "failed",
      statusDetails: { message: "expected 1 to deeply equal 2" },
    }),
  ]);
});

test.each(["test", "prerequest"])("keeps failed assertions above broken %s scripts", async (listen) => {
  const { tests } = await runNewmanCollection({
    event: [{ listen, script: { exec: ['throw new TypeError("collection error");'] } }],
    item: [
      {
        name: "request",
        request: { method: "GET", url: "http://example.com/test" },
        event: [
          { listen: "test", script: { exec: ['pm.test("bad value", function () { pm.expect(1).to.eql(2); });'] } },
        ],
      },
    ],
  });
  expect(tests[0].status).toBe("failed");
  expect(tests[0].statusDetails.message).toBe("bad value, TypeError: collection error");
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "bad value", status: "failed" }),
      expect.objectContaining({ name: "TypeError", status: "broken", statusDetails: { message: "collection error" } }),
    ]),
  );
});

test("keeps network error details when pre-request and test scripts also throw", async () => {
  const { tests } = await runNewmanCollection({
    item: [
      {
        name: "request",
        request: { method: "GET", url: "http://example.com/timeout" },
        event: [
          { listen: "prerequest", script: { exec: ['throw new Error("setup error");'] } },
          { listen: "test", script: { exec: ['throw new Error("test error");'] } },
        ],
      },
    ],
  });
  expect(tests[0].status).toBe("broken");
  expect(tests[0].statusDetails).toEqual({ message: "Timeout" });
  expect(tests[0].steps).toEqual([
    expect.objectContaining({ status: "broken", statusDetails: { message: "setup error" } }),
    expect.objectContaining({ status: "broken", statusDetails: { message: "test error" } }),
  ]);
});

test("reports a pre-request error even when a later script skips the HTTP request", async () => {
  const { tests } = await runNewmanCollection({
    event: [{ listen: "prerequest", script: { exec: ['throw new Error("setup error");'] } }],
    item: [
      {
        name: "request",
        request: { method: "GET", url: "http://example.com/test" },
        event: [{ listen: "prerequest", script: { exec: ["pm.execution.skipRequest();"] } }],
      },
    ],
  });
  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe("broken");
  expect(tests[0].statusDetails).toEqual({ message: "Error: setup error" });
  expect(tests[0].steps).toEqual([
    expect.objectContaining({ status: "broken", statusDetails: { message: "setup error" } }),
  ]);
});
