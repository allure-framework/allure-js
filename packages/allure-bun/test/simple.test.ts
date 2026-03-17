import { test, expect, describe } from "bun:test";

describe("Simple Bun Tests (no dependencies)", () => {
  test("basic math", () => {
    expect(2 + 2).toBe(4);
  });

  test("string operations", () => {
    expect("hello world".toUpperCase()).toBe("HELLO WORLD");
  });

  test("array operations", () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });

  test("async operation", async () => {
    const result = await Promise.resolve("success");
    expect(result).toBe("success");
  });

  test("object equality", () => {
    const obj = { name: "test", value: 42 };
    expect(obj.name).toBe("test");
    expect(obj.value).toBeGreaterThan(40);
  });
});
