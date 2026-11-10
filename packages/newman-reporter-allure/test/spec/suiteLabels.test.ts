import { LabelName, Status } from "allure-js-commons";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { server } from "../mocks/server.js";
import { runNewmanCollection } from "../utils.js";

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

test("replaces only the suite levels supplied by script metadata or the environment", async () => {
  vi.stubEnv("ALLURE_LABEL_suite", "Custom suite");

  const { tests } = await runNewmanCollection({
    info: { name: "Default parent" },
    item: [
      {
        name: "Default suite",
        item: [
          {
            name: "Default sub",
            item: [
              {
                name: "request",
                request: { method: "GET", url: "http://example.com/test" },
                event: [
                  {
                    listen: "test",
                    script: {
                      type: "text/javascript",
                      exec: ["//@allure.label.parentSuite=First", "//@allure.label.parentSuite=Second"],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  const suiteLabelNames: string[] = [LabelName.PARENT_SUITE, LabelName.SUITE, LabelName.SUB_SUITE];
  const suiteLabels = tests[0].labels.filter(({ name }) => suiteLabelNames.includes(name));
  expect(suiteLabels).toHaveLength(4);
  expect(suiteLabels).toEqual(
    expect.arrayContaining([
      { name: LabelName.PARENT_SUITE, value: "First" },
      { name: LabelName.PARENT_SUITE, value: "Second" },
      { name: LabelName.SUITE, value: "Custom suite" },
      { name: LabelName.SUB_SUITE, value: "Default sub" },
    ]),
  );
});
