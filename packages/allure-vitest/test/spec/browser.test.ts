import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { WellKnownParameters } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../utils.js";

describe("browser", () => {
  it("should report browser retries as separate test results", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) =>
        createVitestBrowserConfig(allureResultsPath, {
          retry: 1,
          browser: {
            screenshotFailures: true,
          },
        }),
      "sample.test.ts": `
        import { test, expect } from "vitest";
        import { label, step } from "allure-js-commons";

        const wait = () => new Promise((resolve) => setTimeout(resolve, 15));

        test("flaky browser test", async ({ task }) => {
          await wait();
          if ((task.result?.retryCount ?? 0) === 0) {
            await label("attempt", "failed");
            await step("failed attempt step", async () => {});
          }

          expect(task.result?.retryCount).toBe(1);
        });

        test("failed retried browser test", async ({ task }) => {
          await wait();
          expect(task.result?.retryCount).toBe(2);
        });
      `,
    });

    expect(tests).toHaveLength(4);
    const initialAttempt = expect.arrayContaining([
      { name: WellKnownParameters.Retry, value: "0", excluded: true },
      { name: WellKnownParameters.MaxRetries, value: "1", excluded: true },
    ]);
    const withFirstRetry = expect.arrayContaining([{ name: "Retry", value: "1", excluded: true }]);
    const flakyFailedResult = tests.find(({ name, status }) => name === "flaky browser test" && status === "failed")!;
    const flakyPassedResult = tests.find(({ name, status }) => name === "flaky browser test" && status === "passed")!;

    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "flaky browser test",
          status: "failed",
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("expected +0 to be 1"),
          }),
          parameters: initialAttempt,
        }),
        expect.objectContaining({
          name: "flaky browser test",
          status: "passed",
          parameters: withFirstRetry,
        }),
        expect.objectContaining({
          name: "failed retried browser test",
          status: "failed",
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("expected +0 to be 2"),
          }),
          parameters: initialAttempt,
        }),
        expect.objectContaining({
          name: "failed retried browser test",
          status: "failed",
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("expected 1 to be 2"),
          }),
          parameters: withFirstRetry,
        }),
      ]),
    );

    for (const testResult of tests) {
      expect(testResult.stop).toBeGreaterThan(testResult.start!);
    }

    expect(flakyFailedResult.labels).toContainEqual({ name: "attempt", value: "failed" });
    expect(flakyFailedResult.steps.map(({ name }) => name)).toContain("failed attempt step");
    expect(flakyPassedResult.labels).not.toContainEqual({ name: "attempt", value: "failed" });
    expect(flakyPassedResult.steps.map(({ name }) => name)).not.toContain("failed attempt step");
    expect(flakyPassedResult.attachments).toHaveLength(0);
    expect(flakyFailedResult.historyId).toBe(flakyPassedResult.historyId);

    for (const testResult of tests.filter(
      ({ name, status }) => name === "failed retried browser test" && status === "failed",
    )) {
      expect(testResult.attachments.filter(({ type }) => type === "image/png")).toHaveLength(1);
      expect(testResult.attachments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "image/png",
          }),
        ]),
      );

      for (const attachment of testResult.attachments) {
        expect(attachments[attachment.source]).not.toBeUndefined();
      }
    }
  });

  it("should attach browser failure artifacts", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) =>
        createVitestBrowserConfig(allureResultsPath, {
          browser: {
            screenshotFailures: true,
            trace: "on",
          },
        }),
      "sample.test.ts": `
        import { test, expect } from "vitest";

        test("failed browser test", () => {
          expect(1).toBe(2);
        });
      `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "image/png",
        }),
        expect.objectContaining({
          name: "Trace",
          type: "application/vnd.allure.playwright-trace",
        }),
      ]),
    );

    for (const attachment of tests[0].attachments) {
      expect(attachments[attachment.source]).not.toBeUndefined();
    }
  });

  it("should keep retry parameter scoped to browser mode", async () => {
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath, { retry: 1 }),
      "sample.test.ts": `
        import { test, expect } from "vitest";

        test("flaky node test", async ({ task }) => {
          expect(task.result?.retryCount).toBe(1);
        });
      `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].status).toBe("passed");
    expect(tests[0].parameters).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "Retry" })]));
    expect(tests[0].parameters).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: "Max retries" })]));
  });

  it("should finalize retries after teardown and preserve their runtime messages", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath, { retry: 1 }),
      "sample.test.ts": `
        import { afterEach, aroundEach, expect, test } from "vitest";
        import { attachment, label, step } from "allure-js-commons";

        afterEach(async ({ task }) => {
          await new Promise((resolve) => setTimeout(resolve, 60));
          await step("afterEach " + task.result.retryCount, async () => {});
        });

        aroundEach(async (run, { task }) => {
          await run();
          await new Promise((resolve) => setTimeout(resolve, 200));
          const attempt = String(task.result.retryCount);
          await label("teardown-attempt", attempt);
          await attachment("teardown " + attempt, attempt, "text/plain");
          if (task.result.retryCount === 1) {
            throw new Error("final teardown failure");
          }
        });

        test("late teardown failure", ({ task }) => {
          expect(task.result.retryCount).toBe(1);
        });
      `,
    });

    expect(tests).toHaveLength(2);
    expect(tests[0].status).toBe("failed");
    expect(tests[1].status).toBe("broken");
    expect(tests[1].statusDetails.message).toContain("final teardown failure");
    for (const [index, result] of tests.entries()) {
      const attempt = String(index);
      expect(result.labels.filter(({ name }) => name === "teardown-attempt")).toEqual([
        { name: "teardown-attempt", value: attempt },
      ]);
      expect(result.steps.map(({ name }) => name)).toContain("afterEach " + attempt);
      expect(result.steps.map(({ name }) => name)).toContain("teardown " + attempt);
      expect(result.steps.map(({ name }) => name)).not.toContain("teardown " + String(1 - index));
      const attachment = result.steps.find(({ name }) => name === "teardown " + attempt)!.attachments[0];
      expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(attempt);
      expect(result.stop! - result.start!).toBeGreaterThanOrEqual(260);
    }
  });

  it("should keep failure artifacts available to retries and other reporters", async () => {
    const observationPath = join(tmpdir(), `allure-vitest-artifacts-${randomUUID()}.json`);
    try {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath, testDir }) =>
          createVitestBrowserConfig(allureResultsPath, {
            retry: 1,
            reporters: [testDir + "/observer.ts"],
            browser: { screenshotFailures: true },
          }),
        "observer.ts": `
        import { writeFileSync } from "node:fs";
        export default class Observer {
          onTestRunEnd(modules) {
            const task = modules[0].task.tasks[0];
            writeFileSync(${JSON.stringify(observationPath)}, JSON.stringify(task.artifacts));
          }
        }
      `,
        "sample.test.ts": `
        import { test, expect } from "vitest";
        test("retried failure", ({ task }) => {
          expect(task.artifacts.length).toBe(task.result.retryCount);
          expect(task.result.retryCount).toBe(1);
        });
      `,
      });

      expect(tests.map(({ status }) => status)).toEqual(["failed", "passed"]);
      expect(JSON.parse(await readFile(observationPath, "utf8"))).toEqual([
        expect.objectContaining({ type: "internal:failureScreenshot" }),
      ]);
    } finally {
      await rm(observationPath, { force: true });
    }
  });

  it("should attach custom-directory traces to both failed and passed attempts", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath, testDir }) =>
        createVitestBrowserConfig(allureResultsPath, {
          retry: 1,
          browser: { screenshotFailures: true, trace: { mode: "on", tracesDir: testDir + "/custom-traces" } },
        }),
      "sample.test.ts": `
        import { test, expect } from "vitest";
        test("flaky with traces", ({ task }) => { expect(task.result.retryCount).toBe(1); });
      `,
    });

    expect(tests).toHaveLength(2);
    expect(tests.map(({ status }) => status)).toEqual(["failed", "passed"]);
    for (const result of tests) {
      const trace = result.attachments.find(({ name }) => name === "Trace");
      expect(trace).toEqual(expect.objectContaining({ type: "application/vnd.allure.playwright-trace" }));
      expect(attachments[trace!.source]).not.toBeUndefined();
    }
    expect(tests[0].attachments.filter(({ type }) => type === "image/png")).toHaveLength(1);
    expect(tests[1].attachments.filter(({ type }) => type === "image/png")).toHaveLength(0);
    const firstTrace = tests[0].attachments.find(({ name }) => name === "Trace")!;
    const secondTrace = tests[1].attachments.find(({ name }) => name === "Trace")!;
    expect(attachments[firstTrace.source]).not.toEqual(attachments[secondTrace.source]);
  });

  it("should attach screenshot comparison artifacts from passed tests", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath),
      "sample.test.ts": `
        import { test } from "vitest";
        import { recordArtifact } from "@vitest/runner";
        import { page } from "vitest/browser";

        test("passed comparison", async ({ task }) => {
          document.body.textContent = "Screenshot comparison";
          await recordArtifact(task, {
            type: "internal:toMatchScreenshot",
            message: "Screenshot comparison",
            attachments: [{ name: "actual", path: await page.screenshot(), contentType: "image/png" }],
          });
        });
      `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].status).toBe("passed");
    expect(tests[0].attachments).toEqual([expect.objectContaining({ name: "actual", type: "image/png" })]);
    expect(attachments[tests[0].attachments[0].source]).not.toBeUndefined();
  });

  it("should preserve attempts when aroundEach setup fails on retry", async () => {
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath, { retry: 1 }),
      "sample.test.ts": `
        import { aroundEach, expect, test } from "vitest";
        aroundEach(async (run, { task }) => {
          if (task.result.retryCount === 1) throw new Error("retry setup failed");
          await run();
        });
        test("setup failure on retry", () => { expect(0).toBe(1); });
      `,
    });

    expect(tests.map(({ status }) => status)).toEqual(["failed", "broken"]);
    expect(tests[0].statusDetails.message).toContain("expected +0 to be 1");
    expect(tests[1].statusDetails.message).toContain("retry setup failed");
    expect(tests[1].parameters).toContainEqual({ name: "Retry", value: "1", excluded: true });
    expect(tests[0].historyId).toBe(tests[1].historyId);
  });

  it.each(["on", "on-first-retry"])("should map %s traces across repeats and retries", async (trace) => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) =>
        createVitestBrowserConfig(allureResultsPath, { retry: 1, browser: { trace } }),
      "sample.test.ts": `
        import { expect, test } from "vitest";
        test("repeated flaky", { repeats: 1 }, ({ task }) => { expect(task.result.retryCount).toBe(1); });
        test("repeated failure", { repeats: 1 }, ({ task }) => { expect(task.result.retryCount).toBe(-1); });
      `,
    });

    const flaky = tests.filter(({ name }) => name === "repeated flaky");
    const failed = tests.filter(({ name }) => name === "repeated failure");
    expect(tests).toHaveLength(7);
    expect(flaky.map(({ status }) => status)).toEqual(["failed", "passed", "passed"]);
    expect(failed.map(({ status }) => status)).toEqual(["failed", "failed", "failed", "failed"]);
    expect(flaky.map(({ parameters }) => parameters.find(({ name }) => name === "Retry")?.value)).toEqual([
      "0",
      "1",
      "0",
    ]);
    expect(failed.map(({ parameters }) => parameters.find(({ name }) => name === "Retry")?.value)).toEqual([
      "0",
      "1",
      "0",
      "1",
    ]);
    const traces = [...flaky, ...failed].map(({ attachments: items }) => items.filter(({ name }) => name === "Trace"));
    expect(traces.map((items) => items.length)).toEqual(trace === "on" ? [1, 1, 1, 1, 1, 1, 1] : [0, 1, 0, 0, 1, 0, 1]);
    for (const item of traces.flat()) expect(attachments[item.source]).not.toBeUndefined();
    expect(new Set(traces.flat().map((item) => attachments[item.source])).size).toBe(traces.flat().length);
  });

  it("should report effective retry limits even when a retry condition stops execution early", async () => {
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath, { retry: 2 }),
      "sample.test.ts": `
        import { expect, test } from "vitest";
        test("default limit", () => {});
        test("disabled retries", { retry: 0 }, () => {});
        test("conditional retry", { retry: { count: 3, condition: () => false } }, () => { expect(0).toBe(1); });
      `,
    });

    expect(tests).toHaveLength(3);
    for (const [name, maxRetries] of [
      ["default limit", "2"],
      ["disabled retries", "0"],
      ["conditional retry", "3"],
    ]) {
      expect(tests.find((result) => result.name === name)!.parameters).toEqual(
        expect.arrayContaining([
          { name: WellKnownParameters.Retry, value: "0", excluded: true },
          { name: WellKnownParameters.MaxRetries, value: maxRetries, excluded: true },
        ]),
      );
    }
  });

  it("should preserve the final expected-failure outcome after retries", async () => {
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath, { retry: 1 }),
      "sample.test.ts": `
        import { test, expect } from "vitest";
        test.fails("unexpected pass", ({ task }) => { expect(task.result.retryCount).toBe(1); });
        test.fails("expected failure", () => { expect(1).toBe(2); });
      `,
    });

    const unexpectedPass = tests.filter(({ name }) => name === "unexpected pass");
    expect(unexpectedPass).toHaveLength(2);
    expect(unexpectedPass[1].status).toBe("broken");
    expect(unexpectedPass[1].statusDetails.message).toContain("Expect test to fail");
    const expectedFailure = tests.filter(({ name }) => name === "expected failure");
    expect(expectedFailure).toHaveLength(2);
    expect(expectedFailure[1].status).toBe("passed");
  });

  it("should preserve retry identity when the final attempt is dynamically skipped", async () => {
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath, { retry: 1 }),
      "sample.test.ts": `
        import { test, expect } from "vitest";
        test("skipped retry", async ({ task, skip }) => {
          expect(task.result.retryCount).toBe(1);
          await new Promise((resolve) => setTimeout(resolve, 20));
          skip();
        });
      `,
    });

    expect(tests.map(({ status }) => status)).toEqual(["failed", "skipped"]);
    expect(tests[1].parameters).toContainEqual({ name: "Retry", value: "1", excluded: true });
    expect(tests[0].historyId).toBe(tests[1].historyId);
    expect(tests[1].stop! - tests[1].start!).toBeGreaterThanOrEqual(20);
  });

  it("should allow to attach screenshots", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath),
      "sample.test.ts": `
        import { test, expect } from "vitest";
        import { attachmentPath } from "allure-js-commons";
        import { page } from "vitest/browser";
        import { createElement } from "react";
        import { createRoot } from "react-dom/client";

        test("render react component", async () => {
          const container = document.createElement("div");

          document.body.appendChild(container);

          const root = createRoot(container);

          root.render(createElement("div", null, "Hello, World"));

          await expect.element(page.getByText("Hello, World")).toBeVisible();

          const screenshotPath = await page.screenshot();

          await attachmentPath("screenshot.png", screenshotPath, "image/png")

          root.unmount();
        });
      `,
    });

    expect(tests).toHaveLength(1);

    const [step] = tests[0].steps;

    expect(step.name).toBe("screenshot.png");

    const [attachment] = step.attachments;

    expect(attachments[attachment.source]).not.toBeUndefined();
  });

  it("should assign browser parameter to the tests", async () => {
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath),
      "sample.test.ts": `
        import { test, expect } from "vitest";

        test("should pass", async () => {
          expect(1).toBe(1);
        });
      `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].parameters).toContainEqual({
      name: "browser",
      value: "chromium",
    });
  });
});
