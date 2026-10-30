import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runJasmineInlineTest } from "../utils.js";

it("skipped test", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    xit("skipped", () => {});
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
});

it("test inside skipped suite", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    xdescribe("suite", () => {
      it("skipped", () => {});
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
});

it("not applicable test", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    it("not applicable", () => {
      notApplicable("not for this platform");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].stage).toBe(Stage.PENDING);
  expect(tests[0].status).toBe(Status.SKIPPED);
  expect(tests[0].statusDetails).toEqual({ message: "not for this platform" });
});
