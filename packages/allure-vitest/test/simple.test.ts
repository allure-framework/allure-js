import { describe, expect, test } from "vitest";

test("simple", () => {
  expect(1 + 1).toBe(2);
});

describe("suite", () => {
  test("inner test", () => {
    expect(1 + 1).toBe(2);
  });
});
