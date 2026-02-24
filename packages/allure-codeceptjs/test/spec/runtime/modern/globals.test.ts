import { expect, it } from "vitest";
import { runCodeceptJsInlineTest } from "../../../utils.js";

it("writes globals payload from scenario body", async () => {
  const { globals, attachments } = await runCodeceptJsInlineTest({
    "login.test.js": `
      const { globalAttachment, globalError } = require("allure-js-commons");

      Feature("sample-feature");
      Scenario("sample-scenario", async () => {
        await globalAttachment("global-log", "hello", { contentType: "text/plain" });
        await globalError({ message: "global setup failed", trace: "stack" });
      });
    `,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);
  globalsEntries.forEach(([globalsFileName]) => {
    expect(globalsFileName).toMatch(/.+-globals\.json/);
  });

  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "global setup failed",
        trace: "stack",
        timestamp: expect.any(Number),
      }),
    ]),
  );
  allErrors.forEach((error) => {
    expect(error.timestamp).toEqual(expect.any(Number));
  });
  allAttachments.forEach((attachment) => {
    expect(attachment.timestamp).toEqual(expect.any(Number));
  });
  expect(allErrors.filter((error) => error.message === "global setup failed")).toHaveLength(1);
  expect(allAttachments.filter((attachment) => attachment.name === "global-log")).toHaveLength(1);

  const scenarioAttachment = allAttachments.find((a) => a.name === "global-log");
  expect(scenarioAttachment?.type).toBe("text/plain");
  const encodedScenarioAttachment = attachments[scenarioAttachment!.source] as string;
  expect(Buffer.from(encodedScenarioAttachment, "base64").toString("utf-8")).toBe("hello");
});

it("writes globals payload from suite hooks", async () => {
  const { globals, attachments } = await runCodeceptJsInlineTest({
    "login.test.js": `
      const { globalAttachment, globalError } = require("allure-js-commons");

      Feature("sample-feature");
      BeforeSuite(async () => {
        await globalAttachment("before-suite-log", "before", { contentType: "text/plain" });
      });

      AfterSuite(async () => {
        await globalError({ message: "after suite error" });
      });

      Scenario("sample-scenario", async () => {});
    `,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "after suite error",
        timestamp: expect.any(Number),
      }),
    ]),
  );
  allErrors.forEach((error) => {
    expect(error.timestamp).toEqual(expect.any(Number));
  });
  allAttachments.forEach((attachment) => {
    expect(attachment.timestamp).toEqual(expect.any(Number));
  });

  const beforeSuiteAttachment = allAttachments.find((a) => a.name === "before-suite-log");
  expect(beforeSuiteAttachment?.type).toBe("text/plain");
  const encodedBeforeSuiteAttachment = attachments[beforeSuiteAttachment!.source] as string;
  expect(Buffer.from(encodedBeforeSuiteAttachment, "base64").toString("utf-8")).toBe("before");
});

it("does not collect globals from module scope", async () => {
  const { globals, stdout } = await runCodeceptJsInlineTest({
    "login.test.js": `
      const { globalError } = require("allure-js-commons");

      void globalError({ message: "module scope error" });

      Feature("sample-feature");
      Scenario("sample-scenario", async () => {});
    `,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries).toHaveLength(0);
  expect(stdout.join("\n")).toContain("no test runtime is found");
});
