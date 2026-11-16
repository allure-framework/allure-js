import { join } from "node:path";

import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runJestInlineTest } from "../utils.js";

it("keeps concurrent test statuses, errors and durations with their tests", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      beforeAll(() => {});
      afterAll(() => {});
      test.concurrent("slow pass", async () => { await sleep(150); });
      test.concurrent("fast failure", async () => { await sleep(20); throw new Error("fast error"); });
      test.concurrent("middle pass", async () => { await sleep(80); });
    `,
  });

  expect(tests).toHaveLength(3);
  const slow = tests.find((test) => test.name === "slow pass")!;
  const fast = tests.find((test) => test.name === "fast failure")!;
  const middle = tests.find((test) => test.name === "middle pass")!;
  expect(slow.status).toBe(Status.PASSED);
  expect(slow.statusDetails).toEqual({});
  expect(fast).toMatchObject({
    status: Status.BROKEN,
    statusDetails: { message: "fast error", trace: expect.stringContaining("sample.test.js") },
  });
  expect(middle.status).toBe(Status.PASSED);
  expect(middle.statusDetails).toEqual({});
  expect(fast.stop! - fast.start!).toBeGreaterThan(0);
  expect(middle.stop! - middle.start!).toBeGreaterThan(0);
  expect(slow.stop! - slow.start!).toBeGreaterThan(0);
  expect(fast.stop! - fast.start!).toBeLessThanOrEqual(middle.stop! - middle.start!);
  expect(middle.stop! - middle.start!).toBeLessThanOrEqual(slow.stop! - slow.start!);
  expect(groups).toHaveLength(2);
  for (const group of groups) {
    expect(group.children.toSorted()).toEqual(tests.map((test) => test.uuid).toSorted());
  }
});

it("starts a fresh result for a concurrent retry without consuming a peer result", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      jest.retryTimes(1);
      let attempts = 0;
      test.concurrent("retry", async () => {
        if (++attempts === 1) throw new Error("first attempt");
      });
      test.concurrent("peer", async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
      });
    `,
  });

  expect(tests).toHaveLength(3);
  const attempts = tests.filter((test) => test.name === "retry");
  expect(attempts.map((test) => test.status)).toEqual([Status.BROKEN, Status.PASSED]);
  expect(attempts[0].uuid).not.toBe(attempts[1].uuid);
  expect(attempts[0].fullName).toBe(attempts[1].fullName);
  expect(attempts[0].historyId).toBe(attempts[1].historyId);
  const peer = tests.find((test) => test.name === "peer")!;
  expect(peer.status).toBe(Status.PASSED);
  expect(peer.statusDetails).toEqual({});
});

it("routes runtime messages by test identity even when concurrent names collide", async () => {
  const { tests, attachments } = await runJestInlineTest({
    "jest.config.js": `module.exports = { testEnvironment: "./environment.js" };`,
    "environment.js": ({ allureJestFactoryPath }) => `
      const { TestEnvironment } = require("jest-environment-node");
      const { AsyncLocalStorage } = require("node:async_hooks");
      const { createJestEnvironment } = require("${allureJestFactoryPath}");
      module.exports = class extends createJestEnvironment(TestEnvironment) {
        constructor(...args) {
          super(...args);
          this.global.testEntries = [];
          this.global.testIdentity = new AsyncLocalStorage();
          const handle = this.handleTestEvent.bind(this);
          this.handleTestEvent = (event, state) => {
            if (event.name === "test_start") this.global.testEntries.push(event.test);
            return handle(event, state);
          };
        }
      };
    `,
    "sample.test.js": `
      const { label, step, attachment } = require("allure-js-commons");
      // Model the optional identity getter exposed by newer Jest versions.
      // The locked Jest version does not provide it yet.
      expect.getState().currentTestIdentity = () => global.testIdentity.getStore();
      let enterHook;
      const hookEntered = new Promise((resolve) => { enterHook = resolve; });
      describe("nested", () => {
        beforeAll(() => { enterHook(); return new Promise((resolve) => setTimeout(resolve, 30)); });
        for (const index of [0, 1, 2]) {
        test.concurrent("same name", async () => global.testIdentity.run(global.testEntries[index], async () => {
          await hookEntered;
          await label("owner", String(index));
          await step("step " + index, async () => {
            await new Promise((resolve) => setTimeout(resolve, (3 - index) * 20));
            await attachment("attachment " + index, "content " + index, "text/plain");
          });
        }));
        }
      });
    `,
  });

  expect(tests).toHaveLength(3);
  expect(new Set(tests.map((test) => test.uuid)).size).toBe(3);
  for (const index of [0, 1, 2]) {
    const test = tests.find((result) =>
      result.labels.some((label) => label.name === "owner" && label.value === String(index)),
    )!;
    expect(test.labels.filter((label) => label.name === "owner")).toEqual([{ name: "owner", value: String(index) }]);
    expect(test.name).toBe("same name");
    expect(test.status).toBe(Status.PASSED);
    expect(test.steps).toHaveLength(1);
    expect(test.steps[0]).toMatchObject({ name: `step ${index}`, status: Status.PASSED });
    expect(test.steps[0].steps).toHaveLength(1);
    const [attachment] = test.steps[0].steps[0].attachments;
    expect(attachment.name).toBe(`attachment ${index}`);
    expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(`content ${index}`);
  }
});

it("does not finalize a selected concurrent test when an excluded peer finishes", async () => {
  const { tests } = await runJestInlineTest(
    {
      "testplan.json": JSON.stringify({ version: "1.0", tests: [{ id: "1" }] }),
      "sample.test.js": `
        test.concurrent("selected @allure.id=1", async () => {
          await new Promise((resolve) => setTimeout(resolve, 40));
          throw new Error("selected error");
        });
        test.concurrent("excluded", () => {});
      `,
    },
    (testDir) => ({ ALLURE_TESTPLAN_PATH: join(testDir, "testplan.json") }),
  );
  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({
    name: "selected",
    status: Status.BROKEN,
    stage: Stage.FINISHED,
    statusDetails: { message: "selected error" },
  });
});
