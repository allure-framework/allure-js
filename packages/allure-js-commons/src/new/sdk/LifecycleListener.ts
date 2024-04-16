import { TestResult } from "../model.js";

export interface LifecycleListener {
  beforeTestResultStart: (result: Partial<TestResult>) => void;

  afterTestResultStart: (result: Partial<TestResult>) => void;

  beforeTestResultStop: (result: Partial<TestResult>) => void;

  afterTestResultStop: (result: Partial<TestResult>) => void;

  beforeTestResultUpdate: (result: Partial<TestResult>) => void;

  afterTestResultUpdate: (result: Partial<TestResult>) => void;
}

export class Notifier implements LifecycleListener {
  listeners: LifecycleListener[];

  constructor({ listeners }: { listeners: LifecycleListener[] }) {
    this.listeners = [...listeners];
  }

  private callListeners = (listenerName: keyof LifecycleListener, result: Partial<TestResult>) => {
    for (const listener of this.listeners) {
      try {
        listener?.[listenerName]?.(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`${listenerName} listener handler can't be executed due an error: `, err);
      }
    }
  };

  beforeTestResultStart = (result: Partial<TestResult>) => {
    this.callListeners("beforeTestResultStart", result);
  };

  afterTestResultStart = (result: Partial<TestResult>) => {
    this.callListeners("afterTestResultStart", result);
  };

  beforeTestResultStop = (result: Partial<TestResult>) => {
    this.callListeners("beforeTestResultStop", result);
  };

  afterTestResultStop = (result: Partial<TestResult>) => {
    this.callListeners("afterTestResultStop", result);
  };

  beforeTestResultUpdate = (result: Partial<TestResult>) => {
    this.callListeners("beforeTestResultUpdate", result);
  };

  afterTestResultUpdate = (result: Partial<TestResult>) => {
    this.callListeners("afterTestResultUpdate", result);
  };
}
