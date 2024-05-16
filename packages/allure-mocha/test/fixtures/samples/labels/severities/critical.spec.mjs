import { it } from "mocha";
import { Severity, severity } from "allure-js-commons/new";

it("a critical test", async () => {
  await severity(Severity.CRITICAL);
});
