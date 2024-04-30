import { expect, it } from "vitest";
import { ContentType, Stage, Status } from "allure-js-commons/new/sdk";
import { runCucumberInlineTest } from "../utils";

it("handles data tables", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["dataTable"], ["dataTable"]);

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(3);
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "Given a table step",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "Data table",
          type: ContentType.CSV,
        }),
      ]),
    }),
  );

  const [attachment] = tests[0].steps[0].attachments;

  expect(attachments).toHaveProperty(attachment.source);
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toEqual(
    "a,b,result\n1,3,4\n2,4,6\n",
  );
});
