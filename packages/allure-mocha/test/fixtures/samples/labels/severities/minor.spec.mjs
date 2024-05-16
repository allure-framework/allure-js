import { it } from "mocha";
import { Severity, severity } from "allure-js-commons";

it("a minor test", async () => {
  await severity(Severity.MINOR);
});
