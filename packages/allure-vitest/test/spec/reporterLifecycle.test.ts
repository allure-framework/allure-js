import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { TestResult } from "allure-js-commons";
import AllureVitestReporter from "allure-vitest/reporter";
import { afterEach, expect, it } from "vitest";
import type { RunnerTestSuite as Suite, RunnerTask as Task } from "vitest";
import type { TestModule, Vitest } from "vitest/node";

const vitestPackage = createRequire(import.meta.url)("vitest/package.json") as { version: string };
const installedVersion = vitestPackage.version;

afterEach(() => {
  vitestPackage.version = installedVersion;
});

it.each(["1.3.0", "2.1.1", "3.2.4", "4.1.11"])("writes each run once with the Vitest %s lifecycle", async (version) => {
  vitestPackage.version = version;
  const resultsDir = await mkdtemp(join(tmpdir(), "allure-vitest-lifecycle-"));
  try {
    const results: TestResult[] = [];
    const reporter = new AllureVitestReporter({
      resultsDir,
      listeners: [{ beforeTestResultWrite: (result) => results.push(result) }],
    });
    reporter.onInit({ projects: [] } as unknown as Vitest);

    // Vitest 1/2 call onFinished, Vitest 3 calls both, and Vitest 4 calls onTestRunEnd.
    const legacyReporter = reporter as AllureVitestReporter & { onFinished?: (files: Task[]) => void };
    const major = Number(version.split(".")[0]);
    for (const name of ["first run", "second run"]) {
      const file = {
        type: "suite",
        name: "sample.test.ts",
        filepath: join(resultsDir, "sample.test.ts"),
        mode: "run",
        meta: {},
        tasks: [],
      } as unknown as Suite;
      file.tasks.push({
        type: "test",
        name,
        mode: "run",
        file,
        meta: { allureRuntimeMessages: [{ type: "metadata", data: { description: name } }] },
        result: { state: "pass", startTime: 1, duration: 1 },
      } as Task);

      if (major >= 3) {
        reporter.onTestRunEnd([{ task: file } as unknown as TestModule]);
      }
      if (major < 4) {
        legacyReporter.onFinished?.([file]);
      }
    }

    expect(results.map(({ name, description, status }) => ({ name, description, status }))).toEqual([
      { name: "first run", description: "first run", status: "passed" },
      { name: "second run", description: "second run", status: "passed" },
    ]);
  } finally {
    await rm(resultsDir, { recursive: true, force: true });
  }
});
