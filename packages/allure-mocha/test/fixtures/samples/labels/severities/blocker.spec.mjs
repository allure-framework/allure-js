import { it } from "mocha";
import { Severity, severity } from "allure-js-commons";

it("a blocker", async () => {
  await severity(Severity.BLOCKER);
});
