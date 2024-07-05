// cjs: const { it } = require("mocha");
// cjs: const { Severity, severity } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { Severity, severity } from "allure-js-commons";

it("a critical test", async () => {
  await severity(Severity.CRITICAL);
});
