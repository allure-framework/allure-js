import { Crypto, TestResult } from "../model.js";
import { createTestResult, setTestResultHistoryId } from "./utils.js";
import { Writer } from "./Writer.js";
import { LifecycleListener, Notifier } from "./LifecycleListener.js";
import { LifecycleState } from "./LifecycleState.js";

export class ReporterRuntime {
  private writer: Writer;
  private notifier: Notifier;
  private crypto: Crypto;
  private state = new LifecycleState();

  constructor({
    writer,
    listeners = [],
    crypto,
  }: {
    writer: Writer;
    listeners?: LifecycleListener[];
    crypto: Crypto;
  }) {
    this.writer = writer;
    this.notifier = new Notifier({ listeners });
    this.crypto = crypto;
  }

  start = async (result: Partial<TestResult>) => {
    const uuid = this.crypto.uuid();
    // TODO deepClone
    const stateObject = { ...result, uuid };

    await this.notifier.beforeTestResultStart(stateObject);
    this.state.testResults.set(uuid, { ...result, uuid });
    await this.notifier.afterTestResultStart(stateObject);

    return uuid;
  };

  update = async (uuid: string, updateFunc: (result: Partial<TestResult>) => Promise<void>) => {
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
  };

  stop = async (uuid: string) => {
    const targetResult = this.state.testResults.get(uuid);

    if (!targetResult) {
      // eslint-disable-next-line no-console
      console.error(`No test ${uuid}`);
      return;
    }

    await this.notifier.beforeTestResultStop(targetResult);
    setTestResultHistoryId(this.crypto, targetResult as TestResult);
  };

  write = async (uuid: string) => {
    // TODO: iterate through all the test results and their dependencies (attachments, steps, etc.) and pass the data to the writer
  };
}
