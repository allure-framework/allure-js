import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TestPlanV1 } from "allure-js-commons/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { testPlanFilter } from "../../src/testplan.js";

describe("testPlanFilter", () => {
  let testDir: string;

  const writeTestPlan = (plan: Partial<TestPlanV1>) => {
    const path = join(testDir, "testplan.json");
    writeFileSync(path, JSON.stringify({ version: "1.0", ...plan }));
    vi.stubEnv("ALLURE_TESTPLAN_PATH", path);
  };

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "allure-playwright-testplan-"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(testDir, { recursive: true, force: true });
  });

  it("keeps exclusions disabled by default", () => {
    writeTestPlan({
      tests: [{ selector: "sample.test.ts#excluded" }, { selector: "sample.test.ts#survivor" }],
      excludedTests: [{ selector: "sample.test.ts#excluded" }],
    });
    const titles = ["project sample.test.ts excluded", "project sample.test.ts survivor", "project other.test.ts test"];

    const filters = testPlanFilter();

    expect(titles.filter((title) => filters?.some((filter) => filter.test(title)))).toEqual([
      "project sample.test.ts excluded",
      "project sample.test.ts survivor",
    ]);
  });

  it("vetoes excluded selectors across every selected regex", () => {
    writeTestPlan({
      tests: [
        { selector: ".+.test.ts#excluded [test]" },
        { selector: "sample.test.ts#excluded too" },
        { selector: "sample.test.ts#survivor" },
      ],
      excludedTests: [
        { selector: ".+.test.ts#excluded [test]" },
        { selector: "sample.test.ts#excluded too" },
        { id: 77 },
      ],
    });
    const titles = [
      "project .+.test.ts excluded [test]",
      "project sample.test.ts excluded too",
      "project sample.test.ts survivor",
      "project other.test.ts test",
    ];

    const filters = testPlanFilter(true);

    expect(titles.filter((title) => filters?.some((filter) => filter.test(title)))).toEqual([
      "project sample.test.ts survivor",
    ]);
  });

  it("allows non-excluded titles without selection entries", () => {
    writeTestPlan({ excludedTests: [{ selector: ".+.test.ts#excluded [test]" }] });
    const titles = [
      "project .+.test.ts excluded [test]",
      "project\n.+.test.ts excluded [test]",
      "project .+.test.ts excluded test",
      "project not.+.test.ts excluded [test]",
      "project .+.test.ts excluded [test] extra",
      "project sample.test.ts survivor",
    ];

    const filters = testPlanFilter(true);

    expect(titles.filter((title) => filters?.some((filter) => filter.test(title)))).toEqual(titles.slice(2));
  });

  it("keeps selector matching without exclusions", () => {
    writeTestPlan({ tests: [{ id: 78 }, { selector: ".+.test.ts#survivor [test]" }] });
    const titles = ["project .+.test.ts survivor [test]", "project aaa.test.ts survivor test"];

    const filters = testPlanFilter(true);

    expect(titles.filter((title) => filters?.some((filter) => filter.test(title)))).toEqual([
      "project .+.test.ts survivor [test]",
    ]);
  });

  it("does not filter without a usable test plan", () => {
    writeTestPlan({ tests: [], excludedTests: [] });

    const filters = testPlanFilter(true);

    expect(filters).toBeUndefined();
  });
});
