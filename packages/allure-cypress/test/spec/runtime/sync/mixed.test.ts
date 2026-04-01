import type { Attachment } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCypressInlineTest } from "../../../utils.js";

const attachmentNames = (attachments: Attachment[]) => attachments.map((attachment) => attachment.name).sort();

it("keeps mixed sync and async runtime api calls scoped to the right steps", async () => {
  const { tests, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath, allureCommonsSyncModulePath }) => `
      import * as allure from "${allureCommonsModulePath}";
      import * as allureSync from "${allureCommonsSyncModulePath}";

      it("mixed runtime api", () => {
        allure.label("api", "async-root");
        allureSync.label("api", "sync-root");
        allure.attachment("test-level-async.txt", "test-level-async", "text/plain");
        allureSync.attachment("test-level-sync.txt", "test-level-sync", { contentType: "text/plain" });

        allureSync.step("sync outer", (ctx) => {
          ctx.displayName("sync outer renamed");
          ctx.parameter("outer-mode", "sync");
          allure.attachment("async-inside-sync-outer.txt", "async-inside-sync-outer", "text/plain");
          allureSync.attachment("sync-inside-sync-outer.txt", "sync-inside-sync-outer", { contentType: "text/plain" });
        });

        allure.step("async outer", (ctx) => {
          ctx.displayName("async outer renamed");
          ctx.parameter("outer-mode", "async");
          allure.attachment("async-inside-async-outer.txt", "async-inside-async-outer", "text/plain");
          allureSync.attachment("sync-inside-async-outer.txt", "sync-inside-async-outer", { contentType: "text/plain" });

          allureSync.step("sync child", (childCtx) => {
            childCtx.displayName("sync child renamed");
            childCtx.parameter("child-mode", "sync");
            allure.attachment("async-inside-sync-child.txt", "async-inside-sync-child", "text/plain");
            allureSync.attachment("sync-inside-sync-child.txt", "sync-inside-sync-child", { contentType: "text/plain" });
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "api", value: "async-root" }),
      expect.objectContaining({ name: "api", value: "sync-root" }),
    ]),
  );

  expect(attachmentNames(tests[0].attachments)).toEqual(["test-level-async.txt", "test-level-sync.txt"]);

  const testLevelAsync = tests[0].attachments.find((attachment) => attachment.name === "test-level-async.txt");
  const testLevelSync = tests[0].attachments.find((attachment) => attachment.name === "test-level-sync.txt");

  expect(attachments[testLevelAsync!.source] as string).toBe("test-level-async");
  expect(attachments[testLevelSync!.source] as string).toBe("test-level-sync");

  expect(tests[0].steps).toHaveLength(2);

  const syncOuter = tests[0].steps.find((step) => step.name === "sync outer renamed");
  const asyncOuter = tests[0].steps.find((step) => step.name === "async outer renamed");

  expect(syncOuter).toBeDefined();
  expect(asyncOuter).toBeDefined();

  expect(syncOuter!.parameters).toEqual([{ name: "outer-mode", value: "sync" }]);
  expect(syncOuter!.steps).toHaveLength(0);
  expect(attachmentNames(syncOuter!.attachments)).toEqual([
    "async-inside-sync-outer.txt",
    "sync-inside-sync-outer.txt",
  ]);

  const asyncInsideSyncOuter = syncOuter!.attachments.find((attachment) => attachment.name === "async-inside-sync-outer.txt");
  const syncInsideSyncOuter = syncOuter!.attachments.find((attachment) => attachment.name === "sync-inside-sync-outer.txt");

  expect(attachments[asyncInsideSyncOuter!.source] as string).toBe("async-inside-sync-outer");
  expect(attachments[syncInsideSyncOuter!.source] as string).toBe("sync-inside-sync-outer");

  expect(asyncOuter!.parameters).toEqual([{ name: "outer-mode", value: "async" }]);
  expect(attachmentNames(asyncOuter!.attachments)).toEqual([
    "async-inside-async-outer.txt",
    "sync-inside-async-outer.txt",
  ]);
  expect(asyncOuter!.steps).toHaveLength(1);

  const syncChild = asyncOuter!.steps[0];

  expect(syncChild!.parameters).toEqual([{ name: "child-mode", value: "sync" }]);
  expect(syncChild!.steps).toHaveLength(0);
  expect(attachmentNames(syncChild!.attachments)).toEqual([
    "async-inside-sync-child.txt",
    "sync-inside-sync-child.txt",
  ]);

  const asyncInsideSyncChild = syncChild!.attachments.find((attachment) => attachment.name === "async-inside-sync-child.txt");
  const syncInsideSyncChild = syncChild!.attachments.find((attachment) => attachment.name === "sync-inside-sync-child.txt");

  expect(attachments[asyncInsideSyncChild!.source] as string).toBe("async-inside-sync-child");
  expect(attachments[syncInsideSyncChild!.source] as string).toBe("sync-inside-sync-child");
});

it("keeps mixed sync and async global runtime api calls separate", async () => {
  const { globals, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath, allureCommonsSyncModulePath }) => `
      import * as allure from "${allureCommonsModulePath}";
      import * as allureSync from "${allureCommonsSyncModulePath}";

      it("mixed globals", () => {
        allure.globalAttachment("async-global.txt", "async-global", "text/plain");
        allureSync.globalAttachment("sync-global.txt", "sync-global", { contentType: "text/plain" });
        allure.globalError({ message: "async global error", trace: "async trace" });
        allureSync.globalError({ message: "sync global error", trace: "sync trace" });
      });
    `,
  });

  const globalsEntries = Object.values(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allErrors = globalsEntries.flatMap((info) => info.errors);
  const allAttachments = globalsEntries.flatMap((info) => info.attachments);

  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ message: "async global error", trace: "async trace" }),
      expect.objectContaining({ message: "sync global error", trace: "sync trace" }),
    ]),
  );

  expect(attachmentNames(allAttachments)).toEqual(["async-global.txt", "sync-global.txt"]);

  const asyncGlobal = allAttachments.find((attachment) => attachment.name === "async-global.txt");
  const syncGlobal = allAttachments.find((attachment) => attachment.name === "sync-global.txt");

  expect(attachments[asyncGlobal!.source] as string).toBe("async-global");
  expect(attachments[syncGlobal!.source] as string).toBe("sync-global");
});
