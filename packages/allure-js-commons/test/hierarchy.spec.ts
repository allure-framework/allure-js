import { afterEach, expect, it, vi } from "vitest";

import * as allure from "../src/index.js";
import { ReporterRuntime } from "../src/sdk/reporter/ReporterRuntime.js";
import { MessageTestRuntime } from "../src/sdk/runtime/MessageTestRuntime.js";
import type { LabelHierarchy, RuntimeMessage } from "../src/sdk/types.js";
import * as sync from "../src/sync.js";
import { mockWriter } from "./utils/writer.js";

afterEach(() => vi.unstubAllGlobals());

const cases: { kind: LabelHierarchy["kind"]; names: LabelHierarchy["names"]; expected: string[] }[] = [
  { kind: "suites", names: ["Suite"], expected: ["suite=Suite"] },
  { kind: "suites", names: ["Parent", "Suite"], expected: ["parentSuite=Parent", "suite=Suite"] },
  {
    kind: "suites",
    names: ["Parent", "Suite", "Sub"],
    expected: ["parentSuite=Parent", "subSuite=Sub", "suite=Suite"],
  },
  { kind: "bdd", names: ["Feature"], expected: ["feature=Feature"] },
  { kind: "bdd", names: ["Epic", "Feature"], expected: ["epic=Epic", "feature=Feature"] },
  {
    kind: "bdd",
    names: ["Epic", "Feature", "Story"],
    expected: ["epic=Epic", "feature=Feature", "story=Story"],
  },
];

const facadeCases = cases.flatMap((entry) => (["async", "sync"] as const).map((mode) => ({ ...entry, mode })));

it.each(facadeCases)("replaces $kind with $names through the $mode facade", async ({ kind, names, expected, mode }) => {
  const writer = mockWriter();
  const family = kind === "suites" ? ["parentSuite", "suite", "subSuite"] : ["epic", "feature", "story"];
  const runtime = new ReporterRuntime({
    writer,
    globalLabels: Object.fromEntries(family.map((name) => [name, "global"])),
  });
  const testUuid = runtime.startTest({
    fullName: "file#test",
    labels: [...family.map((name) => ({ name, value: "old" })), { name: "owner", value: "Alice" }],
  });
  const testRuntime = new (class extends MessageTestRuntime {
    sendMessageSync(message: RuntimeMessage) {
      runtime.applyRuntimeMessages(testUuid, [message]);
    }
    async sendMessage(message: RuntimeMessage) {
      this.sendMessageSync(message);
    }
  })();
  vi.stubGlobal("allureTestRuntime", () => (mode === "async" ? Promise.resolve(testRuntime) : testRuntime));

  const api = mode === "async" ? { suites: allure.suites, bdd: allure.bdd } : { suites: sync.suites, bdd: sync.bdd };
  await api[kind](...names);
  runtime.stopTest(testUuid);
  // Adapters may fill defaults after stopTest.
  runtime.updateTest(testUuid, (test) => test.labels.push(...family.map((name) => ({ name, value: "late default" }))));
  runtime.writeTest(testUuid);

  expect(writer.writeResult).toHaveBeenCalledOnce();
  const [result] = writer.writeResult.mock.calls[0];
  expect(
    result.labels
      .filter(({ name }) => family.includes(name))
      .map(({ name, value }) => `${name}=${value}`)
      .sort(),
  ).toEqual(expected);
  expect(result.labels).toContainEqual({ name: "owner", value: "Alice" });
  expect(result.fullName).toBe("file#test");
  expect(result.historyId).toBeTruthy();
});

it("keeps call order when async and sync APIs share an initialized runtime", async () => {
  const messages: RuntimeMessage[] = [];
  const runtime = new (class extends MessageTestRuntime {
    sendMessageSync(message: RuntimeMessage) {
      messages.push(message);
    }
    async sendMessage(message: RuntimeMessage) {
      this.sendMessageSync(message);
    }
  })();
  vi.stubGlobal("allureTestRuntime", () => runtime);

  const firstCall = allure.suites("First");
  sync.suites("Second");
  await firstCall;

  expect(messages).toEqual([
    { type: "metadata", data: { labelHierarchy: { kind: "suites", names: ["First"] } } },
    { type: "metadata", data: { labelHierarchy: { kind: "suites", names: ["Second"] } } },
  ]);
});
