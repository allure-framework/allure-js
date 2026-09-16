import { ContentType, LabelName, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { check, runTestCafeInlineTest } from "../utils.js";

const PAGE_PATH = "/pages/runtime.html";

it("replays runtime API metadata, steps, and attachments", async () => {
  const { tests, attachments } = await runTestCafeInlineTest({
    "pages/runtime.html": "<html><body><h1>Runtime</h1></body></html>",
    "tests/runtime-artifacts/note.txt": "from path",
    "tests/runtime.test.js": `
      const path = require("node:path");
      const {
        attachment,
        attachmentPath,
        allureId,
        description,
        descriptionHtml,
        displayName,
        epic,
        feature,
        historyId,
        issue,
        logStep,
        owner,
        parameter,
        severity,
        step,
        story,
        tag,
        tags,
        testCaseId,
        tms,
      } = require("allure-js-commons");

      fixture\`Runtime fixture\`
        .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

      test("runtime api", async () => {
        await description("runtime markdown");
        await descriptionHtml("<strong>runtime html</strong>");
        await displayName("Runtime display");
        await historyId("custom-history");
        await testCaseId("custom-case");
        await owner("alice");
        await severity("critical");
        await epic("Checkout");
        await feature("Cart");
        await story("Add item");
        await tag("ui");
        await tags("fast", "smoke");
        await allureId("777");
        await issue("https://issues.example/AUTH-10", "ISSUE-10");
        await tms("https://tms.example/TMS-20", "TMS-20");
        await parameter("browserName", "demo");

        await step("Outer step", async (ctx) => {
          await ctx.displayName("Renamed outer step");
          await ctx.parameter("login", "user", "masked");
          await ctx.parameter("tenant", "primary");
          await logStep("logged");
          await attachment("inline.txt", "hello", "text/plain");
          await attachmentPath(
            "from-path.txt",
            path.join(__dirname, "runtime-artifacts", "note.txt"),
            "text/plain",
          );
        });
      });
    `,
  });

  const [testResult] = tests;
  const outerStep = testResult.steps[0];

  await check("verifies logical test metadata from the runtime API", () => {
    expect(tests).toHaveLength(1);
    expect(testResult).toEqual(
      expect.objectContaining({
        name: "Runtime display",
        description: "runtime markdown",
        descriptionHtml: "<strong>runtime html</strong>",
        historyId: "custom-history",
        testCaseId: "custom-case",
        labels: expect.arrayContaining([
          { name: LabelName.OWNER, value: "alice" },
          { name: LabelName.SEVERITY, value: "critical" },
          { name: LabelName.EPIC, value: "Checkout" },
          { name: LabelName.FEATURE, value: "Cart" },
          { name: LabelName.STORY, value: "Add item" },
          { name: LabelName.TAG, value: "ui" },
          { name: LabelName.TAG, value: "fast" },
          { name: LabelName.TAG, value: "smoke" },
          { name: LabelName.ALLURE_ID, value: "777" },
        ]),
        links: expect.arrayContaining([
          { type: "issue", url: "https://issues.example/AUTH-10", name: "ISSUE-10" },
          { type: "tms", url: "https://tms.example/TMS-20", name: "TMS-20" },
        ]),
        parameters: expect.arrayContaining([{ name: "browserName", value: "demo" }]),
      }),
    );
  });

  await check("verifies runtime steps, parameters, and inline attachments", () => {
    expect(outerStep).toEqual(
      expect.objectContaining({
        name: "Renamed outer step",
        status: Status.PASSED,
        parameters: expect.arrayContaining([
          { name: "login", value: "user", mode: "masked" },
          { name: "tenant", value: "primary", mode: undefined },
        ]),
        steps: expect.arrayContaining([
          expect.objectContaining({ name: "logged", status: Status.PASSED }),
          expect.objectContaining({
            name: "inline.txt",
            attachments: [expect.objectContaining({ name: "inline.txt", type: ContentType.TEXT })],
          }),
          expect.objectContaining({
            name: "from-path.txt",
            attachments: [expect.objectContaining({ name: "from-path.txt", type: ContentType.TEXT })],
          }),
        ]),
      }),
    );
  });

  await check("verifies runtime attachment bytes are available", () => {
    outerStep.steps
      .flatMap((stepResult) => stepResult.attachments ?? [])
      .forEach((attachment) => expect(attachments).toHaveProperty(attachment.source));
  });
});

it("installs the global runtime during reporter init so allure-js-commons helpers work automatically", async () => {
  const { tests, attachments } = await runTestCafeInlineTest(
    {
      "pages/runtime.html": `
        <html>
          <body>
            <input id="name" />
            <button id="submit" type="button">Submit</button>
          </body>
        </html>
      `,
      "tests/runtime-auto.test.js": `
        const { attachment, owner, step } = require("allure-js-commons");
        const { Selector } = require("testcafe");

        fixture\`Runtime fixture\`
          .page\`\${process.env.TESTCAFE_BASE_URL}${PAGE_PATH}\`;

        test("global runtime api", async t => {
          await owner("alice");

          await step("Global step", async (ctx) => {
            await ctx.parameter("tenant", "primary");
            await attachment("inline.txt", "hello", "text/plain");
            await t.typeText("#name", "demo-user");
            await t.click("#submit");
          });

          await t.expect(Selector("#name").value).eql("demo-user");
        });
      `,
    },
    {
      createFixturePackageJson: false,
    },
  );

  const [testResult] = tests;
  const outerStep = testResult.steps.find(({ name }) => name === "Global step");

  await check("verifies the reporter-installed global runtime works without a helper wrapper", () => {
    expect(tests).toHaveLength(1);
    expect(testResult.labels).toEqual(expect.arrayContaining([{ name: LabelName.OWNER, value: "alice" }]));
    expect(outerStep).toEqual(
      expect.objectContaining({
        name: "Global step",
        status: Status.PASSED,
        parameters: expect.arrayContaining([{ name: "tenant", value: "primary", mode: undefined }]),
        steps: expect.arrayContaining([
          expect.objectContaining({ name: "inline.txt" }),
          expect.objectContaining({ name: "typeText(#name)", status: Status.PASSED }),
          expect.objectContaining({ name: "click(#submit)", status: Status.PASSED }),
        ]),
      }),
    );
    expect(testResult.steps).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: expect.stringMatching(/^report\b/) })]),
    );
    expect(testResult.steps).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: expect.stringMatching(/\.eql\("demo-user"\)$/) })]),
    );
  });

  await check("verifies attachment bytes stay linked when the global runtime is installed by the reporter", () => {
    outerStep?.steps
      .flatMap((stepResult) => stepResult.attachments ?? [])
      .forEach((attachment) => expect(attachments).toHaveProperty(attachment.source));
  });
});
