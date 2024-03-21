import { AllureLifecycleMessage, Crypto, TestResult } from "../../model.js";
import { AllureWriter } from "../AllureWriter.js";
import { TestHolder } from "../TestHolder.js";


export interface AllureTestRuntime {
  currentTestHolder: TestHolder;

  sendMessage(message: AllureLifecycleMessage): Promise<void>;

  sendMessageSync(message: AllureLifecycleMessage): void;
}

export class AllureStaticTestRuntime implements AllureTestRuntime {
  currentTestHolder: TestHolder = new TestHolder();

  async sendMessage(message: AllureLifecycleMessage): Promise<void> {
  }

  sendMessageSync(message: AllureLifecycleMessage) {
  }
}

/**
 * Client-side code!
 */
// class StaticAllureTestRuntime implements AllureTestRuntime {
//   // reporterRuntime: AllureReporterRuntime;
//   // currentTestHolder: CurrentTestHolder;
//   //
//   // constructor({
//   //               reporterRuntime,
//   //               currentTestHolder,
//   //             }: {
//   //   reporterRuntime: AllureReporterRuntime;
//   //   currentTestHolder: CurrentTestHolder;
//   // }) {
//   //   this.reporterRuntime = reporterRuntime;
//   //   this.currentTestHolder = currentTestHolder;
//   // }
//
//   async sendMessage(message: AllureLifecycleMessage) {
//     const currentTest = this.currentTestHolder.currentTest;
//
//     if (!currentTest) {
//       // TODO fix error
//       throw new Error("no current test");
//     }
//
//     // TODO do update
//     await this.reporterRuntime.update(currentTest, async (result) => {});
//   }
// }

// class DefaultAllureTestRuntime implements AllureTestRuntime {
//   async sendMessage(message: AllureLifecycleMessage) {}
// }
