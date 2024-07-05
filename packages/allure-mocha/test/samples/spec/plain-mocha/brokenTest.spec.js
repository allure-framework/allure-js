// cjs: const { it } = require("mocha");
// esm: import { it } from "mocha";

it("a broken test", async () => {
  throw new Error("foo");
});
