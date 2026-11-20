import { expect, it } from "vitest";

import { runJasmineInlineTest } from "../utils.js";

it.each(["cjs", "mjs"])("keeps results and fixtures isolated across parallel workers with a %s setup", async (ext) => {
  const files: Record<string, string> = {};
  for (const name of ["first", "second", "third", "last"]) {
    files[`spec/${name}.spec.js`] = `
      const allure = require("allure-js-commons");
      describe("${name}", () => {
        beforeAll(async () => {
          // Workers reuse one reporter across files; its soft-assert handler must not accumulate wrappers.
          const Spec = jasmine.private?.Spec ?? jasmine.Spec;
          const handler = Spec?.prototype.addExpectationResult ?? globalThis.expect;
          if (globalThis.previousExpectationHandler) {
            expect(handler).toBe(globalThis.previousExpectationHandler);
          }
          globalThis.previousExpectationHandler = handler;
          await allure.logStep("setup ${name}");
        });
        afterAll(async () => {
          await allure.attachment("teardown ${name}", "teardown ${name}", "text/plain");
        });
        it("${name}", async () => {
          await allure.description("description ${name}");
          await allure.parameter("worker", String(process.pid));
          await allure.step("step ${name}", async () => {
            await new Promise((resolve) => setTimeout(resolve, 30));
            await allure.attachment("body ${name}", "body ${name}", "text/plain");
          });
        });
      });
    `;
  }
  const { tests, groups, attachments, exitCode } = await runJasmineInlineTest(
    {
      ...files,
      "spec/helpers/allure.js": "",
      [`spec/support/allure.${ext}`]: `
        ${ext === "cjs" ? 'const AllureJasmineReporter = require("allure-jasmine");' : 'import AllureJasmineReporter from "allure-jasmine";'}
        const originalIt = globalThis.it;
        const originalDescribe = globalThis.describe;
        jasmine.getEnv().addReporter(new AllureJasmineReporter());
        if (globalThis.it !== originalIt || globalThis.describe !== originalDescribe) {
          throw new Error("Test-plan wrappers must not replace the native API without a test plan");
        }
      `,
      "spec/support/jasmine.json": JSON.stringify({
        spec_dir: "spec",
        spec_files: ["*.spec.js"],
        helpers: [],
        requires: [`./spec/support/allure.${ext}`],
      }),
    },
    undefined,
    { parallel: 2 },
  );

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(4);
  expect(
    new Set(tests.flatMap((test) => test.parameters.filter(({ name }) => name === "worker").map(({ value }) => value)))
      .size,
  ).toBe(2);
  for (const test of tests) {
    const name = test.name;
    expect(test).toMatchObject({ status: "passed", description: `description ${name}` });
    expect(test.fullName).toBe(`dummy:spec/${name}.spec.js#${name} > ${name}`);
    expect(test.steps).toHaveLength(1);
    expect(test.steps[0]).toMatchObject({ name: `step ${name}`, status: "passed" });
    const body = test.steps[0].steps[0].attachments[0];
    expect(Buffer.from(attachments[body.source] as string, "base64").toString()).toBe(`body ${name}`);
    const fixtures = groups.filter((group) => group.children.includes(test.uuid));
    fixtures.forEach((group) => expect(group.children).toEqual([test.uuid]));
    const befores = fixtures.flatMap((group) => group.befores);
    const afters = fixtures.flatMap((group) => group.afters);
    expect(befores).toHaveLength(1);
    expect(afters).toHaveLength(1);
    expect(befores[0].steps[0].name).toBe(`setup ${name}`);
    const teardown = afters[0].steps[0].attachments[0];
    expect(Buffer.from(attachments[teardown.source] as string, "base64").toString()).toBe(`teardown ${name}`);
  }
});

it("reports failed assertions, exceptions, skipped specs and hook failures in parallel", async () => {
  const { tests, groups, globals, exitCode } = await runJasmineInlineTest(
    {
      "spec/support/jasmine.json": JSON.stringify({
        spec_dir: "spec",
        spec_files: ["*.spec.js"],
        requires: ["./spec/helpers/allure.js"],
      }),
      "spec/failures.spec.js": `
        it("assertion", () => { expect(1).toBe(2); });
        it("exception", () => { throw new Error("body error"); });
        it("pending", () => { pending("not ready"); });
      `,
      "spec/hooks.spec.js": `
        describe("broken setup", () => {
          beforeAll(() => { throw new Error("setup error"); });
          it("blocked", () => { throw new Error("must not execute"); });
        });
      `,
    },
    undefined,
    { parallel: 2 },
  );

  expect(exitCode).toBe(3);
  expect(tests).toHaveLength(4);
  expect(tests.find(({ name }) => name === "assertion")).toMatchObject({ status: "failed" });
  expect(tests.find(({ name }) => name === "exception")).toMatchObject({
    status: "broken",
    statusDetails: { message: "Error: body error" },
  });
  expect(tests.find(({ name }) => name === "pending")).toMatchObject({ status: "skipped" });
  expect(tests.find(({ name }) => name === "blocked")).toMatchObject({ status: "broken" });
  expect(groups.flatMap((group) => group.befores)).toEqual([
    expect.objectContaining({
      name: "beforeAll",
      status: "broken",
      statusDetails: { message: "setup error", trace: expect.any(String) },
    }),
  ]);
  expect(Object.values(globals ?? {}).flatMap((info) => info.errors)).toEqual([
    expect.objectContaining({ message: "beforeAll failed: setup error", status: "broken" }),
  ]);
});

it("filters parallel CJS and ESM specs by their file-based test plan selectors", async () => {
  const { tests, exitCode } = await runJasmineInlineTest(
    {
      "spec/helpers/allure.js": "",
      "spec/support/allure.mjs": `
        import AllureJasmineReporter from "allure-jasmine";
        jasmine.getEnv().addReporter(new AllureJasmineReporter());
      `,
      "spec/support/jasmine.json": JSON.stringify({
        spec_dir: "spec",
        spec_files: ["*.spec.?(m)js"],
        requires: ["./spec/support/allure.mjs"],
      }),
      "spec/cjs.spec.js": `
        describe("cjs", () => {
          it("selected", () => {});
          it("excluded", () => { throw new Error("must not execute"); });
        });
      `,
      "spec/esm.spec.mjs": `
        describe("esm", () => {
          it("selected", () => {});
          it("excluded", () => { throw new Error("must not execute"); });
        });
      `,
      "testplan.json": JSON.stringify({
        version: "1.0",
        tests: [
          { selector: "dummy:spec/cjs.spec.js#cjs > selected" },
          { selector: "dummy:spec/esm.spec.mjs#esm > selected" },
        ],
      }),
    },
    { ALLURE_TESTPLAN_PATH: "testplan.json" },
    { parallel: 2 },
  );

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(2);
  expect(tests.map(({ fullName }) => fullName).sort()).toEqual([
    "dummy:spec/cjs.spec.js#cjs > selected",
    "dummy:spec/esm.spec.mjs#esm > selected",
  ]);
  for (const test of tests) {
    expect(test.status).toBe("passed");
    const format = test.fullName!.includes("/cjs.") ? "cjs.spec.js" : "esm.spec.mjs";
    expect(test.labels).toContainEqual({ name: "package", value: `dummy.spec.${format}` });
  }
});

it("selects a root spec by its own callsite after a suite declared in another file", async () => {
  const { tests, exitCode } = await runJasmineInlineTest(
    {
      "spec/support/jasmine.json": JSON.stringify({
        spec_dir: "spec",
        spec_files: ["*.spec.js"],
        requires: ["./spec/helpers/allure.js"],
      }),
      "spec/declarations.cjs": `
        describe("from another file", () => {
          it("excluded", () => { throw new Error("must not execute"); });
        });
      `,
      "spec/root.spec.js": `
        require("./declarations.cjs");
        it("selected root", () => {});
      `,
      "testplan.json": JSON.stringify({
        version: "1.0",
        tests: [{ selector: "dummy:spec/root.spec.js#selected root" }],
      }),
    },
    { ALLURE_TESTPLAN_PATH: "testplan.json" },
    { parallel: 2 },
  );

  expect(exitCode).toBe(0);
  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({ fullName: "dummy:spec/root.spec.js#selected root", status: "passed" });
});
