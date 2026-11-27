import { expect, it, vi } from "vitest";

import type { CypressMessage, CypressTest } from "../../src/types.js";

const createCypressTest = (title: string): CypressTest =>
  ({
    title,
    titlePath: () => [title],
    duration: 0,
    parent: undefined,
  }) as CypressTest;

const setupBrowserLifecycle = async () => {
  vi.resetModules();

  const envValues = new Map<string, unknown>();
  vi.stubGlobal("Cypress", {
    env: vi.fn(function (key: string, value?: unknown) {
      if (arguments.length > 1) {
        envValues.set(key, value);
      }

      return envValues.get(key);
    }),
    platform: "darwin",
  });

  const lifecycle = await import("../../src/browser/lifecycle.js");
  const state = await import("../../src/browser/state.js");

  return {
    ...lifecycle,
    getRuntimeMessages: state.getRuntimeMessages,
  };
};

it("ignores stale pending events for tests that have already ended", async () => {
  const { getRuntimeMessages, reportTestEnd, reportTestSkip, reportTestStart } = await setupBrowserLifecycle();
  const test = createCypressTest("eventually passed");

  reportTestStart(test);
  reportTestEnd(test);

  const messagesBeforePending = getRuntimeMessages().slice();

  reportTestSkip(test);

  expect(getRuntimeMessages()).toEqual(messagesBeforePending);
});

it("ends an attempt that is going to be retried", async () => {
  const { getRuntimeMessages, reportTestRetry, reportTestStart } = await setupBrowserLifecycle();
  const test = createCypressTest("retried");
  (test as any)._currentRetry = 1;

  reportTestStart(test);
  reportTestRetry(test, new Error("attempt failed"));

  expect(getRuntimeMessages().slice(1)).toEqual([
    expect.objectContaining({
      type: "cypress_fail",
      data: expect.objectContaining({ statusDetails: expect.objectContaining({ message: "attempt failed" }) }),
    }),
    { type: "cypress_test_end", data: { duration: 0, retry: 1 } },
  ]);
});

it("ignores retry events of tests other than the current one", async () => {
  const { getRuntimeMessages, reportTestRetry, reportTestStart } = await setupBrowserLifecycle();
  const test = createCypressTest("current");

  reportTestStart(test);
  const messagesBeforeRetry = getRuntimeMessages().slice();

  reportTestRetry(createCypressTest("stale"), new Error("attempt failed"));

  expect(getRuntimeMessages()).toEqual(messagesBeforeRetry);
});

it("reports pending events for the current running test", async () => {
  const { getRuntimeMessages, reportTestSkip, reportTestStart } = await setupBrowserLifecycle();
  const test = createCypressTest("skipped while running");

  reportTestStart(test);
  reportTestSkip(test);

  expect(getRuntimeMessages()).toContainEqual(
    expect.objectContaining<CypressMessage>({
      type: "cypress_test_skip",
      data: {
        statusDetails: {
          message: "This is a pending test",
        },
      },
    }),
  );
});
