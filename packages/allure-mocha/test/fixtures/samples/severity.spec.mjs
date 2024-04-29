import { severity, Severity } from "allure-js-commons/new";
import { it } from "mocha";

[
  Severity.BLOCKER,
  Severity.CRITICAL,
  Severity.NORMAL,
  Severity.MINOR,
  Severity.TRIVIAL
].forEach((s) => {
  it(`severity '${s}'`, async () => {
    await severity(s);
  });
});
