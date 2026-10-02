import { describe, expect, it } from "vitest";

import { createVitestBrowserConfig, runVitestInlineTest } from "../utils.js";

describe("browser", () => {
  it("should report browser retries as separate test results", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => `
        ${createVitestBrowserConfig(allureResultsPath)
          .replace(
            "openTelemetry: {\n        enabled: false,\n      },",
            `openTelemetry: {
        enabled: false,
      },
      retry: 1,`,
          )
          .replace(
            "headless: true,",
            `
          headless: true,
          screenshotFailures: true,
          `,
          )}
      `,
      "sample.test.ts": `
        import { test, expect } from "vitest";

        const wait = () => new Promise((resolve) => setTimeout(resolve, 15));

        test("flaky browser test", async ({ task }) => {
          await wait();
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

    for (const testResult of tests.filter(
      ({ name, status }) => name === "failed retried browser test" && status === "failed",
    )) {
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
      "vitest.config.ts": ({ allureResultsPath }) => `
        ${createVitestBrowserConfig(allureResultsPath).replace(
          "headless: true,",
          `
          headless: true,
          screenshotFailures: true,
          trace: "on",
          `,
        )}
      `,
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

  it("should allow to attach screenshots", async () => {
    const { tests, attachments } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath),
      "sample.test.ts": `
        import { test, expect } from "vitest";
        import { attachmentPath } from "allure-js-commons";
        import { page } from "@vitest/browser/context";
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
