import { expect, it } from "@jest/globals";
import { Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils";

it("passed steps", async () => {
  const { tests } = await runJestInlineTest(`
    it("passed", async () => {
      await allure.step("first step name", async (s1) => {
        await s1.step("second step name", async (s2) => {
          await s2.step("third step name", (s3) => {
            s3.label("foo", "bar");
          });
        });
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].labels).toContainEqual({
    name: "foo",
    value: "bar",
  });
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "first step name",
    }),
  );
  expect(tests[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps).toContainEqual(
    expect.objectContaining({
      name: "second step name",
    }),
  );
  expect(tests[0].steps[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps[0].steps).toContainEqual(
    expect.objectContaining({
      name: "third step name",
    }),
  );
});

it("failed steps", async () => {
  const { tests } = await runJestInlineTest(`
    it("failed", async () => {
      await allure.step("first step name", async (s1) => {
        await s1.step("second step name", async (s2) => {
          await s2.step("third step name", (s3) => {
            throw new Error("foo");
          });
        });
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  expect(tests[0].statusDetails.message).toBe("foo");
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "first step name",
    }),
  );
  expect(tests[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps).toContainEqual(
    expect.objectContaining({
      name: "second step name",
    }),
  );
  expect(tests[0].steps[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps[0].steps).toContainEqual(
    expect.objectContaining({
      name: "third step name",
    }),
  );
});
