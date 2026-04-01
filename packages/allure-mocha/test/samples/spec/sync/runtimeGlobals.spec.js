// cjs: const { it } = require("mocha");
// cjs: const { globalAttachment, globalError } = require("allure-js-commons/sync");
// esm: import { it } from "mocha";
// esm: import { globalAttachment, globalError } from "allure-js-commons/sync";

it("a sync globals test", () => {
  globalAttachment("global-log", "hello", { contentType: "text/plain" });
  globalError({ message: "global setup failed", trace: "stack" });
});
