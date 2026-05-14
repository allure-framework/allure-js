// cjs: const { it } = require("mocha");
// cjs: const { attachment, label, step } = require("allure-js-commons/sync");
// esm: import { it } from "mocha";
// esm: import { attachment, label, step } from "allure-js-commons/sync";

it("a sync runtime step", () => {
  label("mode", "sync");

  step("outer", (ctx) => {
    ctx.displayName("renamed outer");
    ctx.parameter("browser", "chromium");

    step("inner", () => {
      attachment("foo.txt", Buffer.from("bar"), { contentType: "text/plain" });
    });
  });
});
