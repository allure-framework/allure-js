import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class BunTestRuntime extends MessageTestRuntime {
  private messagesStore: Map<string, RuntimeMessage[]> = new Map();
  private currentTestId?: string;

  setCurrentTest(testId: string): void {
    this.currentTestId = testId;
    if (!this.messagesStore.has(testId)) {
      this.messagesStore.set(testId, []);
    }
  }

  getMessages(testId: string): RuntimeMessage[] {
    return this.messagesStore.get(testId) || [];
  }

  clearMessages(testId: string): void {
    this.messagesStore.delete(testId);
  }

  clearAll(): void {
    this.messagesStore.clear();
    this.currentTestId = undefined;
  }

  async sendMessage(message: RuntimeMessage): Promise<void> {
    if (!this.currentTestId) {
      return;
    }

    const messages = this.messagesStore.get(this.currentTestId);
    if (messages) {
      messages.push(message);
    }
  }
}