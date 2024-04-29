import { it } from "mocha";

it("brokenTest", async () => {
  throw new Error("foo");
});
