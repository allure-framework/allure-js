import { Status } from "allure-js-commons";
import { beforeAll, describe, expect, it } from "vitest";

import { runMochaInlineTest } from "../../../utils.js";

describe("sync runtime api", () => {
  let results: Awaited<ReturnType<typeof runMochaInlineTest>>;

  beforeAll(async () => {
    results = await runMochaInlineTest(["sync", "runtimeStep"], ["sync", "runtimeGlobals"]);
  });

  it("handles sync runtime steps", () => {
    const testResult = results.tests.find((test) => test.name === "a sync runtime step")!;

    expect(testResult.labels).toContainEqual(expect.objectContaining({ name: "mode", value: "sync" }));
    expect(testResult.steps).toMatchObject([
      {
        name: "renamed outer",
        status: Status.PASSED,
        parameters: [{ name: "browser", value: "chromium" }],
        steps: [
          expect.objectContaining({
            name: "inner",
            status: Status.PASSED,
            steps: [
              expect.objectContaining({
                name: "foo.txt",
                attachments: [
                  expect.objectContaining({
                    name: "foo.txt",
                    type: "text/plain",
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ]);

    const [attachmentStep] = testResult.steps[0].steps[0].steps;
    const [attachment] = attachmentStep.attachments;
    expect(attachmentStep.name).toBe("foo.txt");
    expect(Buffer.from(results.attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
  });

  it("writes sync runtime globals", () => {
    const globalsEntries = Object.entries(results.globals ?? {});
    expect(globalsEntries.length).toEqual(2);

    const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
    const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
    expect(allErrors).toEqual([
      expect.objectContaining({
        message: "global setup failed",
        trace: "stack",
      }),
    ]);

    expect(allAttachments).toMatchObject([
      expect.objectContaining({
        name: "global-log",
        type: "text/plain",
      }),
    ]);
    expect(Buffer.from(results.attachments[allAttachments[0].source] as string, "base64").toString("utf-8")).toBe(
      "hello",
    );
  });
});
