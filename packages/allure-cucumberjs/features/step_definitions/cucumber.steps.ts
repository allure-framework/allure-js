import { Then, When } from "cucumber";
import * as path from "path";
import { makeFormatterFile } from "./file.steps";
import { ensureFile } from "fs-extra";

When(/^I run cucumber-js with allure$/, { timeout: 10000 }, function() {
  const formatterPath = path.join(this.tmpDir, this.formatterPath);
  const formatterOutPath = path.join(this.tmpDir, this.formatterOutPath);

  return ensureFile(formatterPath)
    .then(() => this.run())
    .catch(() => makeFormatterFile(formatterPath, formatterOutPath).then(() => this.run()));
});

Then(/^it passes$/, () => {});
