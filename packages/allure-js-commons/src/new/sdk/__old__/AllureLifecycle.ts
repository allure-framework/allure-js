// TODO: but possible we need to implement separated AllureStep class
// import { Category, TestResult, TestResultContainer } from "../model.js";
// import { Crypto } from "../model";
// import { AllureStep } from "./AllureExecutable";
// import { AllureTest } from "./AllureTest";
// import { AllureWriter } from "./AllureWriter";

// declare global {
//   // eslint-disable-next-line no-var
//   var allureTestRuntime: AllureTestRuntime;
// }

// interface Bus<T> {
//   sendMessage(message: T): void;
// }

// interface BusAsync<T> {
//   sendMessage(message: T): Promise<void>;
// }

// class BusAllureTestRuntime {}
//
// class AyncBusAllureTestRuntime {}

// example reporter
// class XyzReporter {
//   currentTest: CurrentTestHolder = new CurrentTestHolder();
//   runtime: AllureReporterRuntime;
//   testRuntime: StaticAllureTestRuntime;
//
//   constructor({ writer, listeners }: { writer: AllureWriter; listeners?: LifecycleListener[] }) {
//     this.runtime = new AllureReporterRuntime({
//       writer,
//       listeners,
//       crypto: { md5: (str) => "md5" + str, uuid: () => "uuid" },
//     });
//     this.testRuntime = new StaticAllureTestRuntime({
//       reporterRuntime: this.runtime,
//       currentTestHolder: this.currentTest,
//     });
//     setAllureTestRuntime(this.testRuntime);
//   }
//
//   async onTestBegin(name: string) {
//     const uuid = await this.runtime.start({ name });
//     this.currentTest.currentTest = uuid;
//   }
// }

// interface AllureLifecycle {
//   // use possible bus to send the message to the lifecycle
//   // -> AllureLifecycleMessage
//   sendMessage(message: AllureLifecycleMessage): Promise<void>;
//
//   // use this.sendMessage, but depromisify the method
//   sendMessageSync(message: AllureLifecycleMessage): void;
// }

// TODO:
// globalThis.allureTestRuntime = new DefaultAllureTestRuntime();

// export const setAllureTestRuntime = (runtime: AllureTestRuntime) => {
//   globalThis.allureTestRuntime = runtime;
// };

// class DefaultAllureLifecycle implements AllureLifecycle {
//   async sendMessage(message: AllureLifecycleMessage) {
//     if (!globalThis.allureTestRuntime) {
//       // TODO log instead??
//       throw new Error("allure is not specified");
//     }
//
//     await globalThis.allureTestRuntime.sendMessage(message);
//   }
//
//   sendMessageSync(message: AllureLifecycleMessage) {}
// }

// interface AllureFacade {
//   label(name: string, value: string): void;
//
//   link(url: string, name?: string, type?: string): void;
//
//   parameter(name: string, value: string): void;
//
//   // and rest low-level methods
// }
