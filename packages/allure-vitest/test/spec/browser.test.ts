import { describe, expect, it } from "vitest";
import { createVitestBrowserConfig, runVitestInlineTest } from "../utils.js";

describe("browser", () => {
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
});
