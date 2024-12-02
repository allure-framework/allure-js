import { expect, it } from "vitest";
import { ContentType, Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("attaches screenshots for failed specs", async () => {
  const { tests, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("failed", () => {
      cy.wrap(1).should("eq", 2);
    });
  `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "failed",
      status: Status.FAILED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "wrap 1",
          status: Status.FAILED,
          stage: Stage.FINISHED,
          parameters: [],
          steps: [
            expect.objectContaining({
              name: "assert expected 1 to equal 2",
              status: Status.FAILED,
              stage: Stage.FINISHED,
              parameters: [
                { name: "actual", value: "1" },
                { name: "expected", value: "2" },
              ],
            }),
          ],
        }),
      ],
      attachments: [
        expect.objectContaining({
          name: "failed (failed).png",
          type: ContentType.PNG,
        }),
      ],
    }),
  ]);

  const source = tests[0].attachments[0].source;

  expect(attachments).toHaveProperty(source);
});

it("attaches runtime screenshots", async () => {
  const { tests, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("manual", () => {
      cy.screenshot("foo");
      cy.screenshot();
    });
  `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "manual",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "foo",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [],
          attachments: [
            expect.objectContaining({
              name: "foo",
              type: ContentType.PNG,
            }),
          ],
        }),
        expect.objectContaining({
          name: "manual.png",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [],
          attachments: [
            expect.objectContaining({
              name: "manual.png",
              type: ContentType.PNG,
            }),
          ],
        }),
      ],
    }),
  ]);

  const [
    {
      steps: [
        {
          attachments: [{ source: source1 }],
        },
        {
          attachments: [{ source: source2 }],
        },
      ],
    },
  ] = tests;

  expect(attachments).toHaveProperty(source1);
  expect(attachments).toHaveProperty(source2);
});
