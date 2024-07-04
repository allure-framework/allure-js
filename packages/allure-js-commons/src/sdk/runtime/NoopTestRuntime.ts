import type { TestRuntime } from "./types.js";

export class NoopTestRuntime implements TestRuntime {
  async attachment() {
    await this.warning();
  }

  async attachmentFromPath() {
    await this.warning();
  }

  async description() {
    await this.warning();
  }

  async descriptionHtml() {
    await this.warning();
  }

  async displayName() {
    await this.warning();
  }

  async historyId() {
    await this.warning();
  }

  async labels() {
    await this.warning();
  }

  async links() {
    await this.warning();
  }

  async parameter() {
    await this.warning();
  }

  async logStep() {
    await this.warning();
  }

  async step<T>(name: string, body: () => T | PromiseLike<T>): Promise<T> {
    await this.warning();
    return body();
  }

  async stepDisplayName() {
    await this.warning();
  }

  async stepParameter() {
    await this.warning();
  }

  async testCaseId() {
    await this.warning();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async warning() {
    // eslint-disable-next-line no-console
    console.log("no test runtime is found. Please check test framework configuration");
  }
}

export const noopRuntime: TestRuntime = new NoopTestRuntime();
