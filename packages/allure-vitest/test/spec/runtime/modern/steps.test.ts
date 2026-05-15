import { Stage, Status } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../../../utils.js";

describe("steps", () => {
  describe('for "node"', () => {
    it("handles single lambda step", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("step", () => {});
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      expect(tests[0].steps).toContainEqual(
        expect.objectContaining({
          name: "step",
        }),
      );
    });

    it("handles single lambda step with attachment", async () => {
      const { tests, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step, attachment } from "allure-js-commons";

  test("steps", async () => {
    await step("step", async () => {
      await attachment("foo.txt", Buffer.from("bar"), "text/plain");
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      const [step] = tests[0].steps[0].steps;
      expect(step.name).toBe("foo.txt");

      const [attachment] = step.attachments;

      expect(attachment.name).toBe("foo.txt");
      expect(attachment.type).toBe("text/plain");
      expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
    });

    it("handles nested lambda steps", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("step 1", async () => {
      await step("step 2", async () => {
        await step("step 3", () => {
        });
      });
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      expect(tests[0].steps[0]).toMatchObject({
        name: "step 1",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      expect(tests[0].steps[0].steps).toHaveLength(1);
      expect(tests[0].steps[0].steps[0]).toMatchObject({
        name: "step 2",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      expect(tests[0].steps[0].steps[0].steps).toHaveLength(1);
      expect(tests[0].steps[0].steps[0].steps[0]).toMatchObject({
        name: "step 3",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
    });

    it("handles step renaming", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("foo", async (ctx) => {
      await ctx.displayName("bar");
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      expect(tests[0].steps[0].name).toEqual("bar");
    });

    it("supports step parameters", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("foo", async (ctx) => {
      await ctx.parameter("p1", "v1");
      await ctx.parameter("p2", "v2", "default");
      await ctx.parameter("p3", "v3", "masked");
      await ctx.parameter("p4", "v4", "hidden");
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      const actualStepParameters = tests[0].steps[0].parameters;
      expect(actualStepParameters).toEqual([
        { name: "p1", value: "v1" },
        { name: "p2", value: "v2", mode: "default" },
        { name: "p3", value: "v3", mode: "masked" },
        { name: "p4", value: "v4", mode: "hidden" },
      ]);
    });

    it("keeps log steps attached to the correct concurrent test", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { describe, test } from "vitest";
  import { logStep } from "allure-js-commons";

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  describe.concurrent("dummy", () => {
    test("first", async () => {
      await logStep("First, sync");
      await delay(200);
      await logStep("First, async");
    });

    test("second", async () => {
      await logStep("Second, sync");
      await delay(100);
      await logStep("Second, async");
    });
  });
`,
      });

      expect(tests).toHaveLength(2);
      const first = tests.find(({ name }) => name === "first");
      const second = tests.find(({ name }) => name === "second");

      expect(first?.steps.map(({ name }) => name)).toEqual(["First, sync", "First, async"]);
      expect(second?.steps.map(({ name }) => name)).toEqual(["Second, sync", "Second, async"]);
    });

    it("keeps concurrent steps isolated when setup is registered by the reporter", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath, reporterModulePath }) => `
  import { defineConfig } from "vitest/config";

  export default defineConfig({
    test: {
      openTelemetry: {
        enabled: false,
      },
      reporters: [
        ["${reporterModulePath}", {
          resultsDir: "${allureResultsPath}",
        }]
      ],
    },
  });
`,
        "sample.test.ts": `
  import { describe, test } from "vitest";
  import { logStep } from "allure-js-commons";

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  describe.concurrent("dummy", () => {
    test("first", async () => {
      await logStep("First, sync");
      await delay(200);
      await logStep("First, async");
    });

    test("second", async () => {
      await logStep("Second, sync");
      await delay(100);
      await logStep("Second, async");
    });
  });
`,
      });

      expect(tests).toHaveLength(2);
      const first = tests.find(({ name }) => name === "first");
      const second = tests.find(({ name }) => name === "second");

      expect(first?.steps.map(({ name }) => name)).toEqual(["First, sync", "First, async"]);
      expect(second?.steps.map(({ name }) => name)).toEqual(["Second, sync", "Second, async"]);
    });

    it("keeps nested steps isolated across concurrent tests", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
  import { describe, test } from "vitest";
  import { step } from "allure-js-commons";

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  describe.concurrent("dummy", () => {
    test("first", async () => {
      await step("First outer", async () => {
        await delay(200);
        await step("First inner", () => {});
      });
    });

    test("second", async () => {
      await step("Second outer", async () => {
        await delay(100);
        await step("Second inner", () => {});
      });
    });
  });
`,
      });

      expect(tests).toHaveLength(2);
      const first = tests.find(({ name }) => name === "first");
      const second = tests.find(({ name }) => name === "second");

      expect(first?.steps).toHaveLength(1);
      expect(first?.steps[0].name).toBe("First outer");
      expect(first?.steps[0].steps.map(({ name }) => name)).toEqual(["First inner"]);

      expect(second?.steps).toHaveLength(1);
      expect(second?.steps[0].name).toBe("Second outer");
      expect(second?.steps[0].steps.map(({ name }) => name)).toEqual(["Second inner"]);
    });

    it("supports custom runners in a concurrent environment", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath, reporterModulePath }) => `
          import { defineConfig } from "vitest/config";

          export default defineConfig({
            test: {
              runner: "./runner.mjs",
              openTelemetry: {
                enabled: false,
              },
              reporters: [
                "verbose",
                ["${reporterModulePath}", {
                  resultsDir: "${allureResultsPath}",
                }]
              ],
            },
          });
        `,
        "runner.mjs": `
          export default class CustomRunner {
            constructor(config) {
              this.config = config;
            }
            async importFile(filepath, source) {
              await this.moduleRunner.import(filepath);
            }
          };
        `,
        "sample.test.ts": `
          import { describe, test } from "vitest";
          import { step } from "allure-js-commons";

          const passControl = () => new Promise(setImmediate);

          describe.concurrent("dummy", () => {
            test("first", async () => {
              await step("First outer", async () => {
                await passControl();
                await step("First inner", () => {});
              });
            });

            test("second", async () => {
              await step("Second outer", async () => {
                await passControl();
                await step("Second inner", () => {});
              });
            });
          });
        `,
      });

      expect(tests).toHaveLength(2);
      const first = tests.find(({ name }) => name === "first");
      const second = tests.find(({ name }) => name === "second");

      expect(first?.steps).toHaveLength(1);
      expect(first?.steps[0].name).toBe("First outer");
      expect(first?.steps[0].steps.map(({ name }) => name)).toEqual(["First inner"]);

      expect(second?.steps).toHaveLength(1);
      expect(second?.steps[0].name).toBe("Second outer");
      expect(second?.steps[0].steps.map(({ name }) => name)).toEqual(["Second inner"]);
    });
  });

  describe('for "browser"', () => {
    it("handles single lambda step", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ testDir }) => createVitestBrowserConfig(testDir),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("step", () => {});
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      expect(tests[0].steps).toContainEqual(
        expect.objectContaining({
          name: "step",
        }),
      );
    });

    it("handles single lambda step with attachment", async () => {
      const { tests, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ testDir }) => createVitestBrowserConfig(testDir),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step, attachment } from "allure-js-commons";

  test("steps", async () => {
    await step("step", async () => {
      await attachment("foo.txt", new TextEncoder().encode("bar"), "text/plain");
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      const [step] = tests[0].steps[0].steps;
      expect(step.name).toBe("foo.txt");

      const [attachment] = step.attachments;

      expect(attachment.name).toBe("foo.txt");
      expect(attachment.type).toBe("text/plain");
      expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
    });

    it("handles nested lambda steps", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ testDir }) => createVitestBrowserConfig(testDir),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("step 1", async () => {
      await step("step 2", async () => {
        await step("step 3", () => {
        });
      });
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      expect(tests[0].steps[0]).toMatchObject({
        name: "step 1",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      expect(tests[0].steps[0].steps).toHaveLength(1);
      expect(tests[0].steps[0].steps[0]).toMatchObject({
        name: "step 2",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      expect(tests[0].steps[0].steps[0].steps).toHaveLength(1);
      expect(tests[0].steps[0].steps[0].steps[0]).toMatchObject({
        name: "step 3",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
    });

    it("handles step renaming", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ testDir }) => createVitestBrowserConfig(testDir),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("foo", async (ctx) => {
      await ctx.displayName("bar");
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      expect(tests[0].steps[0].name).toEqual("bar");
    });

    it("supports step parameters", async () => {
      const { tests } = await runVitestInlineTest({
        "vitest.config.ts": ({ testDir }) => createVitestBrowserConfig(testDir),
        "sample.test.ts": `
  import { test } from "vitest";
  import { step } from "allure-js-commons";

  test("steps", async () => {
    await step("foo", async (ctx) => {
      await ctx.parameter("p1", "v1");
      await ctx.parameter("p2", "v2", "default");
      await ctx.parameter("p3", "v3", "masked");
      await ctx.parameter("p4", "v4", "hidden");
    });
  });
`,
      });

      expect(tests).toHaveLength(1);
      expect(tests[0].steps).toHaveLength(1);
      const actualStepParameters = tests[0].steps[0].parameters;
      expect(actualStepParameters).toEqual([
        { name: "p1", value: "v1" },
        { name: "p2", value: "v2", mode: "default" },
        { name: "p3", value: "v3", mode: "masked" },
        { name: "p4", value: "v4", mode: "hidden" },
      ]);
    });
  });
});
