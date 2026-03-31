import { isPromise } from "../utils.js";
import type { SyncTestRuntime, TestRuntime } from "./types.js";

export const NOOP_RUNTIME_WARNING = "no test runtime is found. Please check test framework configuration";
export const NOOP_SYNC_RUNTIME_WARNING =
  "no sync test runtime is found. Please check test framework configuration and adapter sync support";
export const SYNC_STEP_PURE_FUNCTION_ERROR =
  "allure-js-commons/sync step body must be synchronous and must not return a Promise";

export class NoopSyncTestRuntime implements SyncTestRuntime {
  attachment(_: string, __: Buffer | Uint8Array | string, ___: { contentType: string }) {
    this.warning();
  }

  attachmentFromPath(_: string, __: string, ___: { contentType: string }) {
    this.warning();
  }

  globalAttachment(_: string, __: Buffer | Uint8Array | string, ___: { contentType: string }) {
    this.warning();
  }

  globalAttachmentFromPath(_: string, __: string, ___: { contentType: string }) {
    this.warning();
  }

  globalError(_: { message?: string; trace?: string }) {
    this.warning();
  }

  description(_: string) {
    this.warning();
  }

  descriptionHtml(_: string) {
    this.warning();
  }

  displayName(_: string) {
    this.warning();
  }

  historyId(_: string) {
    this.warning();
  }

  labels(..._: { name: string; value: string }[]) {
    this.warning();
  }

  links(..._: { url: string; type?: string; name?: string }[]) {
    this.warning();
  }

  parameter(_: string, __: string, ___?: { excluded?: boolean; mode?: string }) {
    this.warning();
  }

  logStep(_: string, __?: string, ___?: Error) {
    this.warning();
  }

  step<T>(_: string, body: () => T): T {
    this.warning();

    const result = body();
    if (isPromise(result)) {
      const error = new Error(SYNC_STEP_PURE_FUNCTION_ERROR);
      this.warnAboutPromiseStep();
      throw error;
    }

    return result;
  }

  stepDisplayName(_: string) {
    this.warning();
  }

  stepParameter(_: string, __: string, ___?: string) {
    this.warning();
  }

  testCaseId(_: string) {
    this.warning();
  }

  warning() {
    // eslint-disable-next-line no-console
    console.warn(NOOP_SYNC_RUNTIME_WARNING);
  }

  warnAboutPromiseStep() {
    // eslint-disable-next-line no-console
    console.warn(SYNC_STEP_PURE_FUNCTION_ERROR);
  }
}

export const noopSyncRuntime = new NoopSyncTestRuntime();

export class NoopTestRuntime implements TestRuntime {
  sync = noopSyncRuntime;

  async attachment() {
    await this.warning();
  }

  async attachmentFromPath() {
    await this.warning();
  }

  async globalAttachment() {
    await this.warning();
  }

  async globalAttachmentFromPath() {
    await this.warning();
  }

  async globalError() {
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

  async stage() {
    await this.warning();
  }

  async step<T>(_: string, body: () => T | PromiseLike<T>): Promise<T> {
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
    console.log(NOOP_RUNTIME_WARNING);
  }
}

export const noopRuntime: TestRuntime = new NoopTestRuntime();
