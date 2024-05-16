import { it } from "mocha";
import { Severity, severity } from "allure-js-commons/new";

it("a normal test", async () => {
  await severity(Severity.NORMAL);
});
