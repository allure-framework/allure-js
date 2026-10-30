import { LabelName, Stage, Status } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { expect, it } from "vitest";

import { runJasmineInlineTest } from "../utils.js";

const files = {
  "spec/helpers/allure.js": `
      const AllureJasmineReporter = require("allure-jasmine");

      // Older/embedded Jasmine runners omit filename from their reporter events.
      class Reporter extends AllureJasmineReporter {
        specStarted(spec) {
          super.specStarted({ ...spec, filename: spec.description === "known filename" ? spec.filename : undefined });
        }
        specDone(spec) {
          super.specDone({ ...spec, filename: spec.description === "known filename" ? spec.filename : undefined });
        }
      }
      jasmine.getEnv().addReporter(new Reporter());
    `,
  "spec/test/sample.spec.js": `
      describe("suite", () => {
        it("failed", () => { expect(true).toBe(false); });
        xit("skipped", () => {});
        it("known filename", () => {});
      });
      describe("another suite", () => { it("failed", () => {}); });
      it("root spec", () => {});
    `,
};

it("reports stable suite-based identities without filenames and preserves known files", async () => {
  const { tests } = await runJasmineInlineTest(files);
  const { tests: repeated } = await runJasmineInlineTest(files);

  expect(tests).toHaveLength(5);
  expect(repeated).toHaveLength(5);
  for (const [fullName, titlePath] of [
    ["suite > failed", ["dummy", "suite"]],
    ["suite > skipped", ["dummy", "suite"]],
    ["another suite > failed", ["dummy", "another suite"]],
    ["root spec", ["dummy"]],
  ] as const) {
    const result = tests.find((test) => test.fullName === fullName);
    const testCaseId = md5(fullName);
    expect(result).toMatchObject({
      fullName,
      titlePath,
      testCaseId,
      historyId: `${testCaseId}:${md5("")}`,
    });
    expect(result?.labels).not.toContainEqual(expect.objectContaining({ name: LabelName.PACKAGE }));
    expect(repeated.find((test) => test.fullName === fullName)).toMatchObject({
      testCaseId: result?.testCaseId,
      historyId: result?.historyId,
    });
  }
  expect(new Set(tests.map(({ historyId }) => historyId)).size).toBe(5);
  const failed = tests.find(({ fullName }) => fullName === "suite > failed");
  expect(failed).toMatchObject({
    status: Status.FAILED,
    stage: Stage.FINISHED,
    statusDetails: expect.objectContaining({ message: expect.stringContaining("Expected true to be false") }),
    labels: expect.arrayContaining([{ name: LabelName.PARENT_SUITE, value: "suite" }]),
  });
  expect(tests.find(({ name }) => name === "skipped")).toMatchObject({
    status: Status.SKIPPED,
    stage: Stage.PENDING,
  });
  expect(tests.find(({ name }) => name === "known filename")).toMatchObject({
    status: Status.PASSED,
    fullName: "dummy:spec/test/sample.spec.js#suite > known filename",
    labels: expect.arrayContaining([{ name: LabelName.PACKAGE, value: "dummy.spec.test.sample.spec.js" }]),
  });
});

it("selects missing-filename specs using their reported suite-based selectors", async () => {
  const { tests } = await runJasmineInlineTest(
    {
      ...files,
      "spec/test/sample.spec.js": `
        describe("suite", () => {
          it("selected", () => {});
          it("excluded", () => { throw new Error("must not run"); });
        });
      `,
      "testplan.json": JSON.stringify({ version: "1.0", tests: [{ selector: "suite > selected" }] }),
    },
    { ALLURE_TESTPLAN_PATH: "testplan.json" },
  );
  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({
    fullName: "suite > selected",
    status: Status.PASSED,
    testCaseId: md5("suite > selected"),
  });
});
