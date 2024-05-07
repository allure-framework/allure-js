import { severity, Severity } from "allure-js-commons/new";
import { it } from "mocha";

it("a normal test", async () => {
  await severity(Severity.NORMAL);
});
