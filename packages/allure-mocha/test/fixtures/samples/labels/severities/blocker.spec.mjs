import { it } from "mocha";
import { Severity, severity } from "allure-js-commons/new";

it("a blocker", async () => {
  await severity(Severity.BLOCKER);
});
