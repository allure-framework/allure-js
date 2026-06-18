import { AsyncLocalStorage } from "node:async_hooks";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as nodeTest from "node:test";

import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

import type { NodeTestContext, NodeTestTracingStore, RuntimeMessageRecord } from "./model.js";
import { ensureRunDir, getAllureFullName, normalizeFilePath } from "./utils.js";

type NodeTestModule = {
  getTestContext?: () => NodeTestContext | undefined;
};

let getTracingStore: (() => NodeTestTracingStore | undefined) | undefined;
const hookContextStorage = new AsyncLocalStorage<{ context: NodeTestContext; type: "suite" | "test" }>();

const nodeTestModule = nodeTest as unknown as NodeTestModule;

export const hasNodeTestContextApi = () => typeof nodeTestModule.getTestContext === "function";

export const setNodeTestTracingStoreProvider = (provider: () => NodeTestTracingStore | undefined) => {
  getTracingStore = provider;
};

export const runWithNodeTestHookContext = <T>(context: NodeTestContext, type: "suite" | "test", callback: () => T) =>
  hookContextStorage.run({ context, type }, callback);

export class NodeTestRuntime extends MessageTestRuntime {
  constructor(private readonly runDir = ensureRunDir()) {
    super();
  }

  sendMessageSync(message: RuntimeMessage) {
    writeRuntimeMessage(this.runDir, createRuntimeMessageRecord(message));
  }

  async sendMessage(message: RuntimeMessage) {
    this.sendMessageSync(message);

    await Promise.resolve();
  }
}

export const createRuntimeMessageRecord = (message: RuntimeMessage): RuntimeMessageRecord => {
  const hookContext = hookContextStorage.getStore();
  const context = hookContext?.context ?? getNodeTestContext();
  const tracingStore = getTracingStore?.();
  const file = normalizeFilePath(context?.filePath ?? tracingStore?.file);
  const nodeFullName = context?.fullName ?? tracingStore?.fullName ?? tracingStore?.name;
  const testId = context?.testId ?? tracingStore?.testId;
  const workerId = context?.workerId ?? process.env.NODE_TEST_WORKER_ID;

  return {
    version: 1,
    pid: process.pid,
    workerId,
    testId,
    file,
    name: context?.name ?? tracingStore?.name,
    nodeFullName,
    allureFullName: getAllureFullName(file, nodeFullName),
    type: hookContext?.type ?? context?.type ?? tracingStore?.type,
    timestamp: Date.now(),
    message,
  };
};

const getNodeTestContext = () => {
  try {
    return nodeTestModule.getTestContext?.();
  } catch {
    return undefined;
  }
};

export const writeRuntimeMessage = (runDir: string, record: RuntimeMessageRecord) => {
  mkdirSync(runDir, { recursive: true });
  appendFileSync(join(runDir, `runtime-${process.pid}.jsonl`), `${JSON.stringify(record)}\n`, "utf8");
};
