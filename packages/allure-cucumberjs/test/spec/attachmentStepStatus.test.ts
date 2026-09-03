import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../utils.js";

it("keeps a failing scenario failed when an attachment is added after its steps", async () => {
  const { tests } = await runCucumberInlineTest(["attachmentStepStatus"], ["attachmentStepStatus"]);

  const control = tests.find((t) => t.name === "control failing scenario");
  const withAttachment = tests.find((t) => t.name === "failing scenario with a trace attached in an after hook");

  expect(control?.status).toBe(Status.FAILED);
  expect(withAttachment?.status).toBe(Status.FAILED);
  expect(withAttachment?.statusDetails?.message).not.toBe("The test doesn't have an implementation.");
});
