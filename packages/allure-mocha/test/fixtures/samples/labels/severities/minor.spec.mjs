import { severity, Severity } from "allure-js-commons/new";
import { it } from "mocha";

it("a minor test", async () => {
  await severity(Severity.MINOR);
});
