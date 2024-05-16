import { it } from "mocha";
import { Severity, severity } from "allure-js-commons/new";

it("a trivial test", async () => {
  await severity(Severity.TRIVIAL);
});
