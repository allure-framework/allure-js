declare module "testcafe/lib/api/test-run-tracker" {
  import type { TestCafeTestRunTrackerModule } from "./model.js";

  const testRunTracker: TestCafeTestRunTrackerModule;
  export = testRunTracker;
}
