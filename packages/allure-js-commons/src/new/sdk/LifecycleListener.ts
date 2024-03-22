import { TestResult } from "../model.js";

export interface LifecycleListener {
  beforeTestResultStart: (result: Partial<TestResult>) => Promise<void>;

  afterTestResultStart: (result: Partial<TestResult>) => Promise<void>;

  beforeTestResultStop: (result: Partial<TestResult>) => Promise<void>;

  afterTestResultStop: (result: Partial<TestResult>) => Promise<void>;

  beforeTestResultUpdate: (result: Partial<TestResult>) => Promise<void>;

  afterTestResultUpdate: (result: Partial<TestResult>) => Promise<void>;
}

export class Notifier implements LifecycleListener {
  listeners: LifecycleListener[];

  constructor({ listeners }: { listeners: LifecycleListener[] }) {
    this.listeners = [...listeners];
  }

  private callListeners = async (listenerName: keyof LifecycleListener, result: Partial<TestResult>) => {
    for (const listener of this.listeners) {
      try {
        await listener?.[listenerName]?.(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`${listenerName} listener handler can't be executed due an error: `, err);
      }
    }
  };

  beforeTestResultStart = async (result: Partial<TestResult>) => {
    await this.callListeners("beforeTestResultStart", result);
  };

  afterTestResultStart = async (result: Partial<TestResult>) => {
    await this.callListeners("afterTestResultStart", result);
  };

  beforeTestResultStop = async (result: Partial<TestResult>) => {
    await this.callListeners("beforeTestResultStop", result);
  };

  afterTestResultStop = async (result: Partial<TestResult>) => {
    await this.callListeners("afterTestResultStop", result);
  };

  beforeTestResultUpdate = async (result: Partial<TestResult>) => {
    await this.callListeners("beforeTestResultUpdate", result);
  };

  afterTestResultUpdate = async (result: Partial<TestResult>) => {
    await this.callListeners("afterTestResultUpdate", result);
  };
}
