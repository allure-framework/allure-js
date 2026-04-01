import { LabelName, Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../../../utils.js";

it("handles sync runtime steps", async () => {
  const { tests, attachments } = await runCucumberInlineTest(["steps"], ["runtime/sync/steps"]);

  expect(tests).toHaveLength(2);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "succeed",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      labels: expect.arrayContaining([
        {
          name: LabelName.EPIC,
          value: "foo",
        },
        {
          name: "label_name",
          value: "label_value",
        },
      ]),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given allows to define runtime step",
          status: Status.PASSED,
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "first nested step",
              steps: expect.arrayContaining([
                expect.objectContaining({
                  name: "second nested step",
                }),
              ]),
            }),
          ]),
        }),
      ]),
    }),
  );

  const succeeded = tests.find((test) => test.name === "succeed");
  const [attachmentStep] = succeeded!.steps[0].steps[0].steps[0].steps;
  const [attachment] = attachmentStep.attachments;
  expect(attachmentStep.name).toBe("My attachment");
  expect(attachment.type).toBe("application/json");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(
    JSON.stringify({ foo: "bar" }),
  );
});
