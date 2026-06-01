import { AsyncLocalStorage } from "node:async_hooks";

import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

import type { AllureAvaGlobalRuntimeMessageEvent, AllureAvaRuntimeMessageEvent, RuntimeContext } from "./types.js";

type RuntimeMessageSender = (event: AllureAvaRuntimeMessageEvent | AllureAvaGlobalRuntimeMessageEvent) => void;

const contextStorage = new AsyncLocalStorage<RuntimeContext>();

let sender: RuntimeMessageSender | undefined;

export const setRuntimeMessageSender = (nextSender: RuntimeMessageSender) => {
  sender = nextSender;
};

export const runWithRuntimeContext = <T>(context: RuntimeContext, fn: () => T): T => contextStorage.run(context, fn);

export const getRuntimeContext = () => contextStorage.getStore();

const sendMessages = (messages: RuntimeMessage[]) => {
  if (!sender || messages.length === 0) {
    return;
  }

  const context = getRuntimeContext();

  if (!context?.title) {
    sender({
      type: "allure-global-runtime-message",
      messages,
    });
    return;
  }

  sender({
    type: "allure-runtime-message",
    title: context.title,
    isHook: context.isHook,
    messages,
  });
};

export class AllureAvaTestRuntime extends MessageTestRuntime {
  sendMessageSync(message: RuntimeMessage) {
    sendMessages([message]);
  }

  async sendMessage(message: RuntimeMessage) {
    this.sendMessageSync(message);
    await Promise.resolve();
  }
}
