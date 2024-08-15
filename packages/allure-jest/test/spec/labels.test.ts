import { expect, it } from "vitest";
import { runJestInlineTest } from "../utils.js";

it("should add host & thread labels", async () => {
  const { tests } = await runJestInlineTest({
    "nested/sample.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
      it("should fail", () => {
        expect(true).toBe(false);
      });
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: "host",
        value: expect.any(String),
      },
      {
        name: "thread",
        value: expect.any(String),
      },
    ]),
  );
  expect(tests[1].labels).toEqual(
    expect.arrayContaining([
      {
        name: "host",
        value: expect.any(String),
      },
      {
        name: "thread",
        value: expect.any(String),
      },
    ]),
  );
});

it("should add package label", async () => {
  const { tests } = await runJestInlineTest({
    "nested/sample.spec.js": `
      it("test 1", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test 1",
        labels: expect.arrayContaining([
          {
            name: "package",
            value: "nested.sample.spec.js",
          },
        ]),
      }),
    ]),
  );
});

it("should add labels from env variables", async () => {
  const { tests } = await runJestInlineTest(
    {
      "sample.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
    },
    () => ({
      ALLURE_LABEL_A: "a",
      ALLURE_LABEL_B: "b",
    }),
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: "A", value: "a" },
      { name: "B", value: "b" },
    ]),
  );
});
