import { ContentType } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../utils.js";

it("handles playwright trace attachments in after hooks", async () => {
  const { tests, groups, attachments } = await runCucumberInlineTest(["hookAttachments"], ["hookAttachments"]);

  expect(tests).toHaveLength(2);

  const traceTest = tests.find((t) => t.name === "trace attachment in after hook");
  const regularTest = tests.find((t) => t.name === "regular attachment in after hook");

  expect(traceTest).toBeDefined();
  expect(regularTest).toBeDefined();

  // playwright trace attachment should be in the test result
  expect(traceTest!.steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Given a passed step",
        status: "passed",
      }),
      expect.objectContaining({
        name: "Playwright Trace",
        attachments: expect.arrayContaining([
          expect.objectContaining({
            name: "Playwright Trace",
            type: ContentType.PLAYWRIGHT_TRACE,
          }),
        ]),
      }),
    ]),
  );

  // regular attachment should not be in the test result
  expect(regularTest!.steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Given a passed step",
        status: "passed",
      }),
    ]),
  );
  expect(regularTest!.steps!.find((s) => s.name === "Text attachment")).toBeUndefined();
  expect(regularTest!.attachments).toHaveLength(0);

  // regular attachment should be in the after fixture of the group
  expect(groups).toHaveLength(2);
  const regularGroup = groups.find((g) => g.afters?.some((a) => a.steps?.some((s) => s.name === "Text attachment")));
  expect(regularGroup).toBeDefined();
  expect(regularGroup!.afters).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        steps: expect.arrayContaining([
          expect.objectContaining({
            name: "Text attachment",
            attachments: expect.arrayContaining([
              expect.objectContaining({
                name: "Text attachment",
                type: "text/plain",
              }),
            ]),
          }),
        ]),
      }),
    ]),
  );

  expect(Object.keys(attachments as object)).toHaveLength(2);
});
