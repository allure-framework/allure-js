import { Stage, Status } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../utils.js";

it("should report all scenarios when multiple have the same name", async () => {
  const { tests } = await runCucumberInlineTest(["duplicate-names"], ["simple"]);

  expect(tests).toHaveLength(3);
});

it("should assign unique testCaseIds to scenarios with duplicate names", async () => {
  const { tests } = await runCucumberInlineTest(["duplicate-names"], ["simple"]);

  const ids = tests.map((t) => t.testCaseId);
  expect(new Set(ids).size).toBe(3);
});

it("should produce stable testCaseIds for scenarios identified by line number", async () => {
  const { tests } = await runCucumberInlineTest(["duplicate-names"], ["simple"]);

  // duplicate-names.feature lines: Scenario at line 3, 6, 9
  // testCaseId = md5("dummy:features/duplicate-names.feature#same name#<line>")
  const expectedIds = [3, 6, 9].map((line) => md5(`dummy:features/duplicate-names.feature#same name#${line}`));

  const actualIds = new Set(tests.map((t) => t.testCaseId));
  for (const id of expectedIds) {
    expect(actualIds).toContain(id);
  }
});

it("should correctly run each scenario with duplicate name (status check)", async () => {
  const { tests } = await runCucumberInlineTest(["duplicate-names"], ["simple"]);

  const byStatus = (s: Status) => tests.find((t) => t.status === s);

  expect(byStatus(Status.PASSED)).toMatchObject({
    name: "same name",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(byStatus(Status.FAILED)).toMatchObject({
    name: "same name",
    status: Status.FAILED,
    stage: Stage.FINISHED,
  });
  expect(byStatus(Status.BROKEN)).toMatchObject({
    name: "same name",
    status: Status.BROKEN,
    stage: Stage.FINISHED,
  });
});

it("should share fullName for scenarios with duplicate names (known behavior)", async () => {
  const { tests } = await runCucumberInlineTest(["duplicate-names"], ["simple"]);

  // fullName uses pickle.name (not line), so all duplicates share the same fullName.
  // testCaseId is what makes them unique in the report.
  const fullNames = new Set(tests.map((t) => t.fullName));
  expect(fullNames.size).toBe(1);
  expect([...fullNames][0]).toBe("dummy:features/duplicate-names.feature#same name");
});

it("should assign unique testCaseIds to scenarios with duplicate names inside Rule blocks", async () => {
  const { tests } = await runCucumberInlineTest(["duplicate-names-rule"], ["simple"]);

  expect(tests).toHaveLength(3);

  const ids = tests.map((t) => t.testCaseId);
  expect(new Set(ids).size).toBe(3);
});

it("should correctly run scenarios with duplicate names inside Rule blocks (status check)", async () => {
  const { tests } = await runCucumberInlineTest(["duplicate-names-rule"], ["simple"]);

  const statuses = tests.map((t) => t.status).sort();
  expect(statuses).toEqual([Status.BROKEN, Status.FAILED, Status.PASSED].sort());
});
