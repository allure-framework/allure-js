import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should log passed steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "steps.test.js": `
        Feature("a feature");
        Scenario("scenario 1", async ({ I }) => {
          await I.pass();
          await I.pass();
        });
        Scenario("scenario 2", async ({ I }) => {
          await I.pass();
          await I.next();
        });
      `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "scenario 1",
        steps: [
          expect.objectContaining({
            name: "I pass",
            status: Status.PASSED,
          }),
          expect.objectContaining({
            name: "I pass",
            status: Status.PASSED,
          }),
        ],
      }),
      expect.objectContaining({
        status: Status.PASSED,
        name: "scenario 2",
        steps: [
          expect.objectContaining({
            name: "I pass",
            status: Status.PASSED,
          }),
          expect.objectContaining({
            name: "I next",
            status: Status.PASSED,
          }),
        ],
      }),
    ]),
  );
});

it("should log failed steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "steps.test.js": `
        Feature("a feature");
        Scenario("scenario 1", async ({ I }) => {
          await I.pass();
          await I.fail();
        });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.BROKEN,
        name: "scenario 1",
        statusDetails: expect.objectContaining({
          message: "an error",
        }),
        steps: [
          expect.objectContaining({
            name: "I pass",
            status: Status.PASSED,
          }),
          expect.objectContaining({
            name: "I fail",
            status: Status.BROKEN,
          }),
        ],
      }),
    ]),
  );
});

it("should log steps with parameters", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "steps.test.js": `
        Feature("a feature");
        Scenario("scenario 1", async ({ I }) => {
          await I.pass();
          await I.parameters("https://example.com/", "#header");
        });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "scenario 1",
        steps: [
          expect.objectContaining({
            name: "I pass",
            status: Status.PASSED,
          }),
          expect.objectContaining({
            name: 'I parameters "https://example.com/", "#header"',
            status: Status.PASSED,
          }),
        ],
      }),
    ]),
  );
});

it("should support secret step parameters", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "steps.test.js": `
        Feature("a feature");
        Scenario("scenario 1", async ({ I }) => {
          await I.pass();
          await I.parameters("https://example.com/", secret("#header"));
        });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "scenario 1",
        steps: [
          expect.objectContaining({
            name: "I pass",
            status: Status.PASSED,
          }),
          expect.objectContaining({
            name: 'I parameters "https://example.com/", *****',
            status: Status.PASSED,
          }),
        ],
      }),
    ]),
  );
});

it("should log comments", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "steps.test.js": `
        Feature("a feature");
        Scenario("scenario 1", async ({ I }) => {
          await I.pass();
          await I.say("hi");
          await I.say("bye");
        });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "scenario 1",
        steps: [
          expect.objectContaining({
            name: "I pass",
            status: Status.PASSED,
          }),
          expect.objectContaining({
            name: 'I say "hi"',
            status: Status.PASSED,
          }),
          expect.objectContaining({
            name: 'I say "bye"',
            status: Status.PASSED,
          }),
        ],
      }),
    ]),
  );
});

it("should log expects", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "steps.test.js": `
        Feature("a feature");
        Scenario("scenario 1", async ({ I }) => {
          await I.expectEqual(1, 2);
        });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.FAILED,
        name: "scenario 1",
        statusDetails: expect.objectContaining({
          message: "expected 1 to equal 2",
        }),
        steps: [
          expect.objectContaining({
            name: "I expect equal 1, 2",
            status: Status.FAILED,
            statusDetails: expect.objectContaining({
              message: "expected 1 to equal 2",
            }),
          }),
        ],
      }),
    ]),
  );
});
