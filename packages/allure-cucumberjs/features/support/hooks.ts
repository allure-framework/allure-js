import { After, Before, BeforeAll } from "cucumber";
import { removeSync, copySync } from "fs-extra";
import * as path from "path";

const projectPath = path.join(__dirname, "..", "..");

Before(function({ sourceLocation: { uri, line } }) {
  this.tmpDir = path.join(projectPath, "tmp", `${path.basename(uri)}_${line}`);
  const dummyStepsPath = path.join(__dirname, "..", "step_definitions/dummy.steps.js");
  copySync(
    dummyStepsPath,
    path.join(this.tmpDir, "/features/step_definitions/dummy.steps.js")
  );
});

After(function() {
  const tmp = (this.tmpDir = path.join(projectPath, "tmp"));
  removeSync(tmp);
});
