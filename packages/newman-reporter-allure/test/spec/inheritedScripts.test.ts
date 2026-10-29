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

test("reports errors from both folder and request test scripts after a successful collection script", async () => {
  const { tests } = await runNewmanCollection({
    event: [
      { listen: "test", script: { exec: ['pm.test("collection", function () { pm.expect(true).to.be.true; });'] } },
    ],
    item: [
      {
        name: "folder",
        event: [{ listen: "test", script: { exec: ['throw new TypeError("folder error");'] } }],
        item: [
          {
            name: "request",
            request: { method: "GET", url: "http://example.com/test" },
            event: [{ listen: "test", script: { exec: ['throw new Error("request error");'] } }],
          },
        ],
      },
    ],
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe("failed");
  expect(tests[0].statusDetails).toEqual({
    message: "TypeError, Error",
    trace: "Response code: 200, status: OK",
  });
  expect(tests[0].steps).toEqual([
    expect.objectContaining({ name: "collection", status: "passed" }),
    expect.objectContaining({ name: "TypeError", status: "failed", statusDetails: { message: "folder error" } }),
    expect.objectContaining({ name: "Error", status: "failed", statusDetails: { message: "request error" } }),
  ]);
});
