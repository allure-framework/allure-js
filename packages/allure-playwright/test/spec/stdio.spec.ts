import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

it("reports stdout", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test("Demo test", async () => {
        console.log("Test log");
        console.error('System err 1');
        console.log("Test log 2");
        console.error('System err 2');
        console.log({ "foo": 'bar' });
        console.log([1, 2, 3, "test"]);
        console.error({ foo: 'bar' });
        console.error([1, 2, 3, "test"]);
        await test.step("nested", async () => {
          console.log("Test nested log");
          console.error('System err 3');
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(2);

  const [stdout, stderr] = tests[0].attachments;

  expect(stdout.name).toBe("stdout");
  expect(stdout.type).toBe(ContentType.TEXT);
  expect(attachments).toHaveProperty(stdout.source);
  expect(stderr.name).toBe("stderr");
  expect(stderr.type).toBe(ContentType.TEXT);
  expect(attachments).toHaveProperty(stderr.source);
  expect(Buffer.from(attachments[stdout.source] as string, "base64").toString("utf-8")).toBe(
    "Test log\nTest log 2\n{ foo: 'bar' }\n[ 1, 2, 3, 'test' ]\nTest nested log\n",
  );
  expect(Buffer.from(attachments[stderr.source] as string, "base64").toString("utf-8")).toEqual(
    "System err 1\nSystem err 2\n{ foo: 'bar' }\n[ 1, 2, 3, 'test' ]\nSystem err 3\n",
  );
});
