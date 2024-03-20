// TODO: but possible we need to implement separated AllureStep class
import { Category, TestResult, TestResultContainer } from "../model";
import { Crypto } from "../model";
import { AllureStep } from "./AllureExecutable";
import { AllureTest } from "./AllureTest";
import { AllureWriter } from "./AllureWriter";

interface AllureLifecycleMessage {}

class AllureRuntime {
  currentTest?: AllureTest;

  currentStep?: AllureStep;

  handleLifecycleMessage(message: AllureLifecycleMessage) {
    /**
     * handle the message
     *
     * - set labels
     * - set parameters
     * - create step
     * - close step
     *
     * etc...
     */
  }
}

/**
 * Moved from AllureReporterRuntime to test. DO NOT EXPORT
 */
class State {
  testResults = new Map<string, Partial<TestResult>>();
  testContainers = new Map<string, Partial<TestResultContainer>>();

  // startTestResult = (uuid: string, result: Partial<TestResult>) => {
  //   // TODO deepClone
  //   this.testResults.set(uuid, { ...result });
  // };

  // updateTestResult = (uuid: string, updateFunction: (result: Partial<TestResult>) => void) => {
  //
  // }
}

interface LifecycleListener {
  beforeTestResultStart: (result: Partial<TestResult>) => Promise<void>;

  afterTestResultStart: (result: Partial<TestResult>) => Promise<void>;

  beforeTestResultStop: (result: Partial<TestResult>) => Promise<void>;

  afterTestResultStop: (result: Partial<TestResult>) => Promise<void>;

  beforeTestResultUpdate: (result: Partial<TestResult>) => Promise<void>;

  afterTestResultUpdate: (result: Partial<TestResult>) => Promise<void>;
}

/**
 * DO NOT EXPORT
 */
class Notifier implements LifecycleListener {
  listeners: LifecycleListener[];

  constructor({ listeners }: { listeners: LifecycleListener[] }) {
    this.listeners = [...listeners];
  }

  beforeTestResultStart = async (result: Partial<TestResult>) => {
    for (const listener of this.listeners) {
      try {
        await listener.beforeTestResultStart(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("beforeTestResultStart listener handler can't be executed due an error: ", err);
      }
    }
  };

  afterTestResultStart = async (result: Partial<TestResult>) => {
    for (const listener of this.listeners) {
      try {
        await listener.afterTestResultStart(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("afterTestResultStart listener handler can't be executed due an error: ", err);
      }
    }
  };

  beforeTestResultStop = async (result: Partial<TestResult>) => {
    for (const listener of this.listeners) {
      try {
        await listener.beforeTestResultStop(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("beforeTestResultStop listener handler can't be executed due an error: ", err);
      }
    }
  };

  beforeTestResultUpdate = async (result: Partial<TestResult>) => {
    for (const listener of this.listeners) {
      try {
        await listener.beforeTestResultUpdate(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("beforeTestResultUpdate listener handler can't be executed due an error: ", err);
      }
    }
  };

  afterTestResultUpdate = async (result: Partial<TestResult>) => {
    for (const listener of this.listeners) {
      try {
        await listener.afterTestResultUpdate(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("afterTestResultUpdate listener handler can't be executed due an error: ", err);
      }
    }
  };
}

/**
 * Runtime which should be used in an integration entry-point
 */
class AllureReporterRuntime {
  private writer: AllureWriter;
  private notifier: Notifier;
  private crypto: Crypto;
  private state = new State();

  constructor({
    writer,
    listeners = [],
    crypto,
  }: {
    writer: AllureWriter;
    listeners?: LifecycleListener[];
    crypto: Crypto;
  }) {
    this.writer = writer;
    this.notifier = new Notifier({ listeners });
    this.crypto = crypto;
  }

  start = async (result: Partial<TestResult>): string => {
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
      // TODO:
      console.error("...");
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
      console.error(`No test ${uuid}`);
      return;
    }

    await this.notifier.beforeTestResultStop(targetResult);
  };

  write = async () => {};

  // TODO
  // start (name) => Promise<uuid>
  // update (uuid, updateFunc) => Promise<void>
  // stop (uuid) => Promise<void>
  // write (uuid) => Promise<void>
}

interface AllureTestRuntime {
  sendMessage(message: AllureLifecycleMessage): Promise<void>;
}

class CurrentTestHolder {
  currentTest?: string;
}

/**
 * Client-side code!
 */
class StaticAllureTestRuntime implements AllureTestRuntime {
  reporterRuntime: AllureReporterRuntime;
  currentTestHolder: CurrentTestHolder;

  constructor({
    reporterRuntime,
    currentTestHolder,
  }: {
    reporterRuntime: AllureReporterRuntime;
    currentTestHolder: CurrentTestHolder;
  }) {
    this.reporterRuntime = reporterRuntime;
    this.currentTestHolder = currentTestHolder;
  }

  async sendMessage(message: AllureLifecycleMessage) {
    const currentTest = this.currentTestHolder.currentTest;
    if (!currentTest) {
      // TODO fix error
      throw new Error("no current test");
    }

    // TODO do update
    await this.reporterRuntime.update(currentTest, async (result) => {});
  }
}

interface Bus<T> {
  sendMessage(message: T): void;
}

interface BusAsync<T> {
  sendMessage(message: T): Promise<void>;
}


class BusAllureTestRuntime {

}


class AyncBusAllureTestRuntime {

}

class XyzReporter {
  currentTest: CurrentTestHolder = new CurrentTestHolder();
  runtime: AllureReporterRuntime;
  testRuntime: StaticAllureTestRuntime;

  constructor({ writer, listeners }: { writer: AllureWriter; listeners?: LifecycleListener[] }) {
    this.runtime = new AllureReporterRuntime({
      writer,
      listeners,
      crypto: { md5: (str) => "md5" + str, uuid: () => "uuid" },
    });
    this.testRuntime = new StaticAllureTestRuntime({
      reporterRuntime: this.runtime,
      currentTestHolder: this.currentTest,
    });
    setAllureTestRuntime(this.testRuntime);
  }


  async onTestBegin(name: string) {
    const uuid = await this.runtime.start({ name });
    this.currentTest.currentTest = uuid;
  }
}

class DefaultAllureTestRuntime implements AllureTestRuntime {
  async sendMessage(message: AllureLifecycleMessage) {}
}

interface AllureLifecycle {
  // use possible bus to send the message to the lifecycle
  // -> AllureLifecycleMessage
  sendMessage(message: AllureLifecycleMessage): Promise<void>;

  // use this.sendMessage, but depromisify the method
  sendMessageSync(message: AllureLifecycleMessage): void;
}

/**
 * Not exported to global USERS
 */
declare global {
  // eslint-disable-next-line no-var
  var allureTestRuntime: AllureTestRuntime;
}

/**
 * TODO:
 * `allure-js-commons/new/<node|browser>`
 * `allure-js-commons/new/sdk/<node|browser>`
 *
 * Remove `new` for 3.0.0 release
 */

/**
 * EXPORT ME
 */
const setAllureTestRuntime = (runtime: AllureTestRuntime) => {
  globalThis.allureTestRuntime = runtime;
};

globalThis.allureTestRuntime = new DefaultAllureTestRuntime();

class DefaultAllureLifecycle implements AllureLifecycle {
  async sendMessage(message: AllureLifecycleMessage) {
    if (!globalThis.allureTestRuntime) {
      // TODO log instead??
      throw new Error("allure is not specified");
    }

    await globalThis.allureTestRuntime.sendMessage(message);
  }

  sendMessageSync(message: AllureLifecycleMessage) {}
}

interface AllureFacade {
  label(name: string, value: string): void;

  link(url: string, name?: string, type?: string): void;

  parameter(name: string, value: string): void;

  // and rest low-level methods
}
