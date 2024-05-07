import { it } from "mocha";
import { expect } from "chai";

it("a failed test", async () => {
  expect("foo").eq("bar", "baz");
});
