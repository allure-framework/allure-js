import { AsyncLocalStorage } from "node:async_hooks";
import * as diagnosticsChannel from "node:diagnostics_channel";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";

import type { NodeTestTracingStore } from "./model.js";
import { NodeTestRuntime, hasNodeTestContextApi, setNodeTestTracingStoreProvider } from "./runtime.js";
import { hasExecutableTestPlan, installCommonJsTestPlanFilter } from "./testplan.js";
import { ensureRunDir, normalizeFilePath } from "./utils.js";

const SETUP_KEY = "__allure_node_test_setup__";

const assertSupportedNodeVersion = () => {
  if (!hasNodeTestContextApi()) {
    throw new Error(
      "allure-node-test/setup requires Node.js >= 26.1.0 for no-import-change runtime API support. " +
        "Use allure-node-test/reporter without the setup module for reporter-only results on older Node.js versions.",
    );
  }
};

const installTracingStore = () => {
  const storage = new AsyncLocalStorage<NodeTestTracingStore>();
  const testChannel = (diagnosticsChannel as any).tracingChannel?.("node.test");

  testChannel?.start?.bindStore?.(storage, (data: NodeTestTracingStore) => ({
    ...data,
    file: normalizeFilePath(data?.file),
  }));

  setNodeTestTracingStoreProvider(() => storage.getStore());
};

const installTestPlanFilter = () => {
  if (!hasExecutableTestPlan()) {
    return false;
  }

  installCommonJsTestPlanFilter();
  register("allure-node-test/loader", pathToFileURL(`${process.cwd()}/`));

  return true;
};

if (!(globalThis as any)[SETUP_KEY]) {
  (globalThis as any)[SETUP_KEY] = true;

  const testPlanFilterInstalled = installTestPlanFilter();

  if (!testPlanFilterInstalled) {
    assertSupportedNodeVersion();
  }

  const runDir = ensureRunDir();

  if (hasNodeTestContextApi()) {
    installTracingStore();
    setGlobalTestRuntime(new NodeTestRuntime(runDir));
  }
}
