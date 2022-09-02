import { assert, describe, expect, it } from "vitest";
import { allure } from "../src/helpers";

describe("suite name", () => {
  it("foo", () => {
    allure.label({ value: "sdf", name: "test" });
    allure.link({ url: "vk.com" });
    allure.owner("vovsy");

    expect(1 + 1).toEqual(2);
    expect(true).toBeTruthy();
  });
  it("bar", () => {
    assert.equal(Math.sqrt(4), 2);
  });

  it("snapshot", () => {
    expect(1).toBe(1);
  });
});
