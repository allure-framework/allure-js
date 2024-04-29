import { it } from "mocha";
import { expect } from "chai";

it("failedTest", async () => {
  expect("foo").eq("bar", "baz");
});
