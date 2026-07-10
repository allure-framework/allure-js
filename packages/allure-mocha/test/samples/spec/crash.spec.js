// cjs: const { it, describe } = require("mocha");
// esm: import { it, describe } from "mocha";

describe("checkout flow", () => {
  it("step one passes", () => {});

  it("step two passes", () => {});

  it("step three crashes the whole process", function (done) {
    void done;
    // simulate an unrelated background task (e.g. a queue worker, a native addon callback)
    // calling process.exit() outside of mocha's control — mocha cannot catch this as a test failure
    setTimeout(() => {
      process.exit(1);
    }, 10);
    // never call done() — the test stays "running" until the process dies
  });

  it("step four never runs", () => {});
});
