import { severity, Severity } from "allure-js-commons/new";
import { it } from "mocha";

it("a critical test", async () => {
  await severity(Severity.CRITICAL);
});
