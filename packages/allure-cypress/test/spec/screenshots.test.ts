import { ContentType, Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

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

it.each(["before", "after"])("preserves screenshot callbacks registered %s Allure", async (order) => {
  const { tests, attachments, globals } = await runCypressInlineTest({
    "cypress/support/e2e.js": ({ allureCypressModulePath }) => `
      const capturePaths = [];
      const registerCallback = () => Cypress.Screenshot.defaults({
        onAfterScreenshot(_el, details) { capturePaths.push(details.path); },
      });
      ${order === "before" ? "registerCallback();" : ""}
      require("${allureCypressModulePath}");
      ${order === "after" ? "registerCallback();" : ""}
      after(() => {
        expect(capturePaths.length, "external screenshot callback calls").to.eq(2);
      });
    `,
    "cypress/e2e/sample.cy.js": () => `
      it("manual", () => { cy.screenshot("shared"); });
      it("failure", () => { expect(true).to.eq(false); });
    `,
  });

  expect(Object.values(globals ?? {}).flatMap((info) => info.errors)).toEqual([]);
  expect(tests).toHaveLength(2);
  expect(tests.find(({ name }) => name === "manual")?.status).toBe(Status.PASSED);
  const manual = tests.find(({ name }) => name === "manual")!;
  expect(manual.steps[0]).toMatchObject({
    name: "shared",
    attachments: [expect.objectContaining({ type: ContentType.PNG })],
  });
  const failed = tests.find(({ name }) => name === "failure")!;
  expect(failed).toMatchObject({
    status: Status.FAILED,
    statusDetails: { message: expect.stringContaining("expected true to equal false") },
  });
  expect(failed.attachments).toHaveLength(1);
  for (const source of [manual.steps[0].attachments[0].source, failed.attachments[0].source]) {
    expect(attachments).toHaveProperty(source);
  }
});

it("keeps native screenshot callback replacement, command callbacks and errors", async () => {
  const { tests, attachments, globals } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("replace defaults", () => {
        const calls = [];
        Cypress.Screenshot.defaults({ onAfterScreenshot() { calls.push("replaced"); } });
        Cypress.Screenshot.defaults({
          onAfterScreenshot(_el, details) { calls.push("current:" + details.name); },
        });
        cy.screenshot("configured", {
          onAfterScreenshot(_el, details) { calls.push("command:" + details.name); },
        }).then(() => {
          expect(calls).to.deep.eq(["command:configured", "current:configured"]);
        });
      });
      it("callback error", () => {
        Cypress.Screenshot.defaults({
          screenshotOnRunFailure: false,
          onAfterScreenshot() { throw new Error("original callback failure"); },
        });
        cy.screenshot("callback throws");
      });
    `,
  });

  expect(Object.values(globals ?? {}).flatMap((info) => info.errors)).toEqual([]);
  expect(tests).toHaveLength(2);
  const passed = tests.find(({ name }) => name === "replace defaults")!;
  expect(passed.status).toBe(Status.PASSED);
  const screenshot = passed.steps.find(({ name }) => name === "configured")!;
  expect(screenshot.attachments).toHaveLength(1);
  expect(attachments).toHaveProperty(screenshot.attachments[0].source);
  const failed = tests.find(({ name }) => name === "callback error")!;
  expect(failed).toMatchObject({
    status: Status.BROKEN,
    statusDetails: { message: expect.stringContaining("original callback failure") },
  });
  expect(failed.attachments).toHaveLength(0);
  const failedScreenshot = failed.steps.find(({ name }) => name === "callback throws")!;
  expect(failedScreenshot.attachments).toEqual([
    expect.objectContaining({ name: "callback throws", type: ContentType.PNG }),
  ]);
  expect(attachments).toHaveProperty(failedScreenshot.attachments[0].source);
});

it("preserves screenshots moved or deleted by a snapshot plugin before the messages are flushed", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress.config.js": ({ allureCypressReporterModulePath, supportFilePath, specPattern, allureDirPath }) => `
      const { createHash } = require("node:crypto");
      const { readFileSync, readdirSync, renameSync, unlinkSync } = require("node:fs");
      const { join } = require("node:path");
      const { allureCypress } = require("${allureCypressReporterModulePath}");
      const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
      const screenshotHashes = [];
      const attachmentHashes = () => readdirSync("${allureDirPath}")
        .filter((file) => file.endsWith(".png"))
        .map((file) => digest(join("${allureDirPath}", file)));

      module.exports = {
        video: false,
        e2e: {
          supportFile: "${supportFilePath}",
          specPattern: "${specPattern}",
          setupNodeEvents(on, config) {
            allureCypress(on, config, { resultsDir: "${allureDirPath}" });
            on("task", {
              processSnapshot(path) {
                const hash = digest(path);
                if (!attachmentHashes().includes(hash)) {
                  throw new Error("Screenshot was not written before the snapshot plugin ran");
                }
                screenshotHashes.push(hash);
                if (screenshotHashes.length === 1) {
                  renameSync(path, path + ".actual.png");
                } else {
                  unlinkSync(path);
                }
                return null;
              },
              verifyScreenshots() {
                return { expected: screenshotHashes, actual: attachmentHashes() };
              },
            });
            return config;
          },
        },
      };
    `,
    "cypress/e2e/sample.cy.js": () => `
      it("snapshot comparison fails", () => {
        let path;
        for (const color of ["red", "blue"]) {
          cy.document().then((doc) => { doc.body.style.background = color; });
          cy.screenshot("snapshot", {
            overwrite: true,
            onAfterScreenshot: (_, details) => { path = details.path; },
          });
          cy.then(() => cy.task("processSnapshot", path));
        }
        cy.then(() => { assert.fail("Snapshot comparison failed"); });
      });

      it("following test runs and both original images are attached", () => {
        cy.task("verifyScreenshots").then(({ expected, actual }) => {
          expect(expected).to.have.length(2);
          expect(expected[0]).not.to.eq(expected[1]);
          expect(actual).to.include.members(expected);
        });
      });
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "snapshot comparison fails",
        status: Status.FAILED,
        statusDetails: expect.objectContaining({ message: expect.stringContaining("Snapshot comparison failed") }),
      }),
      expect.objectContaining({
        name: "following test runs and both original images are attached",
        status: Status.PASSED,
      }),
    ]),
  );
  const comparison = tests.find(({ name }) => name === "snapshot comparison fails");
  expect(comparison?.steps.filter(({ name }) => name === "snapshot")).toEqual([
    expect.objectContaining({ attachments: [expect.objectContaining({ name: "snapshot", type: ContentType.PNG })] }),
    expect.objectContaining({ attachments: [expect.objectContaining({ name: "snapshot", type: ContentType.PNG })] }),
  ]);
});
