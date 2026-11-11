import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Status } from "allure-js-commons";
import { afterAll, beforeAll, expect, it } from "vitest";

import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterAll(() => server.close());

const collection = {
  info: { name: "Data-driven collection" },
  item: [
    {
      name: "Same request",
      request: { method: "GET", url: "http://example.com/test" },
      event: [
        {
          listen: "test",
          script: {
            exec: [
              'pm.test("row " + pm.iterationData.get("case"), () => {',
              "  pm.response.to.have.status(200);",
              "});",
            ],
          },
        },
      ],
    },
  ],
};

it("reports CSV iteration data as parameters with stable history", async () => {
  const first = { case: "first", value: "A" };
  const second = { case: "second", value: "B" };
  const expectedRows = [first, second, first, first];
  const dir = await mkdtemp(join(tmpdir(), "allure-newman-data-"));
  try {
    const path = join(dir, "data.csv");
    await writeFile(path, "case,value\nfirst,A\nsecond,B\nfirst,A");
    // Newman reuses the last data row when iterationCount exceeds the file's length.
    const { tests } = await runNewmanCollection(collection, { iterationData: path, iterationCount: 4 });
    expect(tests).toHaveLength(4);
    for (const [i, test] of tests.entries()) {
      const row = expectedRows[i];
      expect(test.status).toBe(Status.PASSED);
      expect(test.steps[0].name).toBe(`row ${row.case}`);
      expect(test.parameters).toEqual(
        expect.arrayContaining([
          { name: "case", value: row.case },
          { name: "value", value: row.value },
        ]),
      );
    }
    expect(new Set(tests.map(({ fullName }) => fullName)).size).toBe(1);
    expect(new Set(tests.map(({ testCaseId }) => testCaseId)).size).toBe(1);
    expect(tests[0].historyId).toBeTruthy();
    expect(tests[1].historyId).not.toBe(tests[0].historyId);
    expect(tests[2].historyId).toBe(tests[0].historyId);
    expect(tests[3].historyId).toBe(tests[0].historyId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("reports typed JSON iteration values as string parameters", async () => {
  const { tests } = await runNewmanCollection(collection, {
    iterationData: [{ case: "typed", count: 0, enabled: false }],
  });
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].parameters).toEqual(
    expect.arrayContaining([
      { name: "count", value: "0" },
      { name: "enabled", value: "false" },
    ]),
  );
});

it("keeps iterations without data grouped as retries", async () => {
  const { tests } = await runNewmanCollection(collection, { iterationCount: 2 });
  expect(tests).toHaveLength(2);
  expect(tests[0].historyId).toBeTruthy();
  expect(tests[1].historyId).toBe(tests[0].historyId);
  expect(tests[0].parameters).toEqual([
    { name: "Request", value: "GET - http://example.com/test" },
    { name: "Response Code", value: "200", excluded: true },
  ]);
});
