import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runCucumberInlineTest } from "../utils.js";

it("should set full name", async () => {
  const { tests } = await runCucumberInlineTest(["simple"], ["simple"]);

  expect(tests).toHaveLength(3);
  const passedTest = tests.find((test) => test.name === "passed");
  expect(passedTest?.labels).toEqual(
    expect.arrayContaining([
      {
        name: "_fallbackTestCaseId",
        value: md5("features/simple.feature#passed"),
      },
    ]),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "passed",
      fullName: "dummy:features/simple.feature#passed",
      status: Status.PASSED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "failed",
      fullName: "dummy:features/simple.feature#failed",
      status: Status.FAILED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "broken",
      fullName: "dummy:features/simple.feature#broken",
      status: Status.BROKEN,
    }),
  );
});

it("should calculate fullName in a CWD-independent manner", async () => {
  const { tests } = await runCucumberInlineTest(["nested/simple"], ["simple"], {
    cwd: "features/nested",
  });

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "passed",
      fullName: "dummy:features/nested/simple.feature#passed",
      status: Status.PASSED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "failed",
      fullName: "dummy:features/nested/simple.feature#failed",
      status: Status.FAILED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "broken",
      fullName: "dummy:features/nested/simple.feature#broken",
      status: Status.BROKEN,
    }),
  );
});
