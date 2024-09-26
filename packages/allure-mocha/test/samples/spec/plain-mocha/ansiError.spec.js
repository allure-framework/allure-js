// cjs: const { it } = require("mocha");
// esm: import { it } from "mocha";

it("a test with ansi chars in error", async () => {
  throw new Error(
    "\u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoEqual\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // deep equality\u001b[22m\n\nExpected: \u001b[32m5\u001b[39m\nReceived: \u001b[31m4\u001b[39m",
  );
});
