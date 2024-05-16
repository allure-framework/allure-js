import { expect } from "chai";
import { it } from "mocha";

it("a failed test", async () => {
  expect("foo").eq("bar", "baz");
});
