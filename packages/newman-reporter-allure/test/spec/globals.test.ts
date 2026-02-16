import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("writes empty globals payload", async () => {
  const collection = {
    info: {
      name: "globals",
    },
    item: [
      {
        name: "suite",
        item: [
          {
            name: "request",
            event: [
              {
                listen: "test",
                script: {
                  exec: ['pm.test("Status code is 200", function () { pm.response.to.have.status(200); });'],
                  type: "text/javascript",
                },
              },
            ],
            request: {
              method: "GET",
              header: [],
              url: {
                host: ["example", "com"],
                path: ["test"],
              },
            },
            response: [],
          },
        ],
      },
    ],
  };

  const { globals } = await runNewmanCollection(collection);

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries).toHaveLength(1);

  const [globalsFileName, globalInfo] = globalsEntries[0];
  expect(globalsFileName).toMatch(/.+-globals\.json/);
  expect(globalInfo).toEqual({
    attachments: [],
    errors: [],
  });
});
