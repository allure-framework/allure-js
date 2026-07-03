import { createRequire } from "node:module";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PACKAGE_ROOT } from "../utils.js";

const require = createRequire(import.meta.url);

// TestCafe resolves a string-named reporter as require(`testcafe-reporter-${name}`)
// and always calls the result as pluginFactory(options), where options is `undefined`
// (not omitted) for a bare reporter name like `reporter: ["spec", "allure-official"]`.
// See testcafe/lib/utils/reporter.js (requireReporterPluginFactory) and
// testcafe/lib/reporter/index.js (getReporterPlugins: `plugin: pluginFactory(options)`).
const REQUIRED_PLUGIN_METHODS = [
  "init",
  "reportTaskStart",
  "reportFixtureStart",
  "reportTestStart",
  "reportTestActionStart",
  "reportTestActionDone",
  "reportTestDone",
  "reportTaskDone",
  "reportWarnings",
  "reportData",
];

describe("CJS entry as loaded by TestCafe's string-name reporter mechanism", () => {
  const distIndexPath = join(PACKAGE_ROOT, "dist", "cjs", "index.js");

  it("require() returns a callable factory rather than an exports object", () => {
    const pluginFactory = require(distIndexPath);

    expect(typeof pluginFactory).toBe("function");
  });

  it("pluginFactory(undefined) returns a ready-to-use plugin object implementing every reporter method", () => {
    const pluginFactory = require(distIndexPath);
    const plugin = pluginFactory(undefined);

    expect(typeof plugin).toBe("object");
    REQUIRED_PLUGIN_METHODS.forEach((method) => {
      expect(typeof plugin[method]).toBe("function");
    });
  });
});
