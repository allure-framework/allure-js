import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("should handle timeout exceptions", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      it("should add two numbers", async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(1 + 2).toEqual(3);
      }, 50);
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr).toMatchObject({
    status: Status.BROKEN,
    statusDetails: expect.objectContaining({
      message: expect.stringContaining("timeout"),
      trace: expect.stringContaining("sample.test.js"),
    }),
  });
});

it("should handle string errors", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      it("should add two numbers", async () => {
        throw "some string";
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr).toMatchObject({
    status: Status.BROKEN,
    statusDetails: {
      message: expect.stringContaining("some string"),
      trace: expect.stringContaining("sample.test.js"),
    },
  });
});

it("should handle object errors", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      it("should add two numbers", async () => {
        throw { val: "some string" };
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr).toMatchObject({
    status: Status.BROKEN,
    statusDetails: {
      message: expect.stringContaining("some string"),
      trace: expect.stringContaining("sample.test.js"),
    },
  });
});

it("should handle expect errors", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      it("should add two numbers", async () => {
        expect(1).toEqual(2);
      });
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr).toMatchObject({
    status: Status.FAILED,
    statusDetails: {
      message: expect.stringMatching(/Expected: 2\s+Received: 1/),
      trace: expect.stringContaining("sample.test.js"),
    },
  });
});

it("should set actual and expected values for expects", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      it("should add two numbers", async () => {
        expect(1).toEqual(2);
      });
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr).toMatchObject({
    status: Status.FAILED,
    statusDetails: {
      actual: "1",
      expected: "2",
    },
  });
});
