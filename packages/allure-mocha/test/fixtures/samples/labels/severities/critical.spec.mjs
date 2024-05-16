import { it } from "mocha";
import { Severity, severity } from "allure-js-commons";

it("a critical test", async () => {
  await severity(Severity.CRITICAL);
});
