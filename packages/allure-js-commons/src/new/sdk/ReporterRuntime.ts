import { Stage, TestResult } from "../model.js";
import { deepClone } from "../utils.js";
import { Crypto } from "./Crypto.js";
import { LifecycleListener, Notifier } from "./LifecycleListener.js";
import { LifecycleState } from "./LifecycleState.js";
import { Writer } from "./Writer.js";
import { createTestResult, setTestResultHistoryId } from "./utils.js";

export class ReporterRuntime {
  private writer: Writer;
  private notifier: Notifier;
  private crypto: Crypto;
  private state = new LifecycleState();

  constructor({ writer, listeners = [], crypto }: { writer: Writer; listeners?: LifecycleListener[]; crypto: Crypto }) {
    this.writer = writer;
    this.notifier = new Notifier({ listeners });
    this.crypto = crypto;
  }

  start = async (result: Partial<TestResult>, start?: number) => {
    const uuid = this.crypto.uuid();
    const stateObject: TestResult = {
      ...createTestResult(uuid),
      ...deepClone(result),
      start: start || Date.now(),
    };

    await this.notifier.beforeTestResultStart(stateObject);
    this.state.testResults.set(uuid, { ...result, uuid });
    await this.notifier.afterTestResultStart(stateObject);
    this.state.setTestResult(uuid, stateObject);

    return uuid;
  };

  update = async (uuid: string, updateFunc: (result: Partial<TestResult>) => void | Promise<void>) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error("There is no test result to update!");
      return;
    }

    // TODO: validate that the result link is the same for all the notifier hooks
    await this.notifier.beforeTestResultUpdate(targetResult);
    await updateFunc(targetResult);
    await this.notifier.afterTestResultUpdate(targetResult);
    this.state.setTestResult(uuid, targetResult as TestResult);
  };

  stop = async (uuid: string, stop?: number) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test ${uuid}`);
      return;
    }

    await this.notifier.beforeTestResultStop(targetResult);

    setTestResultHistoryId(this.crypto, targetResult as TestResult);
    targetResult.stop = stop || Date.now();

    await this.notifier.afterTestResultStop(targetResult);
  };

  write = async (uuid: string) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test ${uuid}`);
      return;
    }

    this.writer.writeResult(targetResult as TestResult);
  };
}
