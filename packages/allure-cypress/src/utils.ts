import { Status } from "allure-js-commons"
import type { CypressHook } from "./model.js";

export const uint8ArrayToBase64 = (data: unknown) => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (!u8arrayLike) {
    return data as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return btoa(String.fromCharCode.apply(null, data as number[]));
};

export const normalizeAttachmentContentEncoding = (data: unknown, encoding: BufferEncoding): BufferEncoding => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (u8arrayLike) {
    return "base64";
  }

  return encoding;
};

export const getSuitePath = (test: Mocha.Test): string[] => {
  const path: string[] = [];
  let currentSuite: Mocha.Suite | undefined = test.parent;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent;
  }

  return path;
};

export const pickUntil = <T = unknown>(items: T[], predicate: (item: T) => boolean, offset?: number) => {
  const predicateIndex = items.findIndex(predicate);

  if (predicateIndex === -1) {
    return [];
  }

  const matchIndex = predicateIndex + 1 + (offset || 0);

  if (matchIndex < 0) {
    return [];
  }

  return items.slice(0, matchIndex);
};

export const normalizeCypressHook = (
  hook: Mocha.Hook & {
    hookName: string;
    err?: { message: string; stack: string };
  },
): CypressHook => {
  return {
    name: hook.hookName,
    type: /after/i.test(hook.hookName) ? "after" : "before",
    status: hook.state === "failed" ? Status.FAILED : Status.PASSED,
    statusDetails: hook.err ? { message: hook.err.message, trace: hook.err.stack } : undefined
  };
};

export const getCypressSuiteHooks = (suite: Mocha.Suite): CypressHook[] => {
  // @ts-ignore
  const { _beforeAll = [], _beforeEach = [], _afterAll = [], _afterEach = [] } = suite
  const suiteHooks = [].concat(_beforeAll).concat(_beforeEach).concat(_afterEach).concat(_afterAll) as (Mocha.Hook & {
    hookName: string;
    err?: { message: string; stack: string };
  })[]

  return suiteHooks.map((hook) => normalizeCypressHook(hook))
};
