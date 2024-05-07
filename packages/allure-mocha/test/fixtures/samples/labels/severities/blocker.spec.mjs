import { severity, Severity } from "allure-js-commons/new";
import { it } from "mocha";

it("a blocker", async () => {
  await severity(Severity.BLOCKER);
});
