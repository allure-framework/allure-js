import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("retries", () => {
  let tests: TestResult[];
  let groups: TestResultContainer[];
  beforeAll(async () => {
    const allureResults = await runMochaInlineTest("retries");
    tests = allureResults.tests;
    groups = allureResults.groups;
  });

  it("should have correct retries count", () => {
    expect(tests.length).toBe(4);

    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "a test with retries",
          status: "broken",
          statusDetails: expect.objectContaining({
            message: "attempt 0 is expected to fail",
          }),
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "it 1",
            }),
            expect.objectContaining({
              name: "it 2",
            }),
            expect.objectContaining({
              name: "it 3",
            }),
          ]),
        }),
        expect.objectContaining({
          name: "a test with retries",
          status: "broken",
          statusDetails: expect.objectContaining({
            message: "attempt 1 is expected to fail",
          }),
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "it 1",
            }),
            expect.objectContaining({
              name: "it 2",
            }),
            expect.objectContaining({
              name: "it 3",
            }),
          ]),
        }),
        expect.objectContaining({
          name: "a test with retries",
          status: "broken",
          statusDetails: expect.objectContaining({
            message: "attempt 2 is expected to fail",
          }),
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "it 1",
            }),
            expect.objectContaining({
              name: "it 2",
            }),
            expect.objectContaining({
              name: "it 3",
            }),
          ]),
        }),
        expect.objectContaining({
          name: "a test with retries",
          status: "passed",
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "it 1",
            }),
            expect.objectContaining({
              name: "it 2",
            }),
            expect.objectContaining({
              name: "it 3",
            }),
            expect.objectContaining({
              name: "it is ok!",
            }),
          ]),
        }),
      ]),
    );
  });

  it("should add retry parameter to retries", () => {
    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "a test with retries",
          status: "broken",
          parameters: [],
        }),
        expect.objectContaining({
          name: "a test with retries",
          status: "broken",
          parameters: expect.arrayContaining([
            expect.objectContaining({
              name: "Retry",
              value: "1",
              excluded: true,
            }),
          ]),
        }),
        expect.objectContaining({
          name: "a test with retries",
          status: "broken",
          parameters: expect.arrayContaining([
            expect.objectContaining({
              name: "Retry",
              value: "2",
              excluded: true,
            }),
          ]),
        }),
        expect.objectContaining({
          name: "a test with retries",
          status: "passed",
          parameters: expect.arrayContaining([
            expect.objectContaining({
              name: "Retry",
              value: "3",
              excluded: true,
            }),
          ]),
        }),
      ]),
    );
  });

  it("should add hooks for retries", () => {
    const uuids = tests.map((t) => t.uuid);

    uuids.forEach((uuid) => {
      const containers = groups.filter((g) => g.children.indexOf(uuid) > -1);
      const befores = containers.flatMap((c) => c.befores);
      const afters = containers.flatMap((c) => c.afters);

      expect(befores).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '"before each" hook',
            steps: expect.arrayContaining([
              expect.objectContaining({
                name: "beforeEach 1",
              }),
              expect.objectContaining({
                name: "beforeEach 2",
              }),
            ]),
          }),
        ]),
      );
      expect(afters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: '"after each" hook',
            steps: expect.arrayContaining([
              expect.objectContaining({
                name: "afterEach 1",
              }),
              expect.objectContaining({
                name: "afterEach 2",
              }),
            ]),
          }),
        ]),
      );
    });
  });
});
