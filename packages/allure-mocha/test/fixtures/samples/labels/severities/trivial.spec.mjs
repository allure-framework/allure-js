import { severity, Severity } from "allure-js-commons/new";
import { it } from "mocha";

it("a trivial test", async () => {
  await severity(Severity.TRIVIAL);
});
