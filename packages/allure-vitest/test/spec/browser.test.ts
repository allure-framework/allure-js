import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    const withoutRetry = expect.not.arrayContaining([expect.objectContaining({ name: "Retry" })]);
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
          parameters: withoutRetry,
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
          parameters: withoutRetry,
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
  });

  it("should finalize retries after teardown and preserve their runtime messages", async () => {
    const { tests } = await runVitestInlineTest({
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
      expect(result.stop! - result.start!).toBeGreaterThanOrEqual(60);
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
        test("skipped retry", ({ task, skip }) => {
          expect(task.result.retryCount).toBe(1);
          skip();
        });
      `,
    });

    expect(tests.map(({ status }) => status)).toEqual(["failed", "skipped"]);
    expect(tests[1].parameters).toContainEqual({ name: "Retry", value: "1", excluded: true });
    expect(tests[0].historyId).toBe(tests[1].historyId);
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
