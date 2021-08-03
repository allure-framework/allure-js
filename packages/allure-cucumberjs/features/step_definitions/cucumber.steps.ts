import * as path from "path";
import chai from "chai";
import { Then, When } from "cucumber";
import { pathExistsSync } from "fs-extra";
import { ChaiPartial } from "../support/chai-partial";
import { makeFormatterFile } from "./file.steps";
chai.use(ChaiPartial);

When(/^I run cucumber-js with allure$/, { timeout: 10000 }, function() {
  const formatterPath = path.join(this.tmpDir, this.formatterPath);
  const formatterOutPath = path.join(this.tmpDir, this.formatterOutPath);

  return pathExistsSync(formatterPath)
    ? this.run()
    : makeFormatterFile(formatterPath, formatterOutPath).then(() => this.run());
});

Then(/^it passes$/, () => {});
