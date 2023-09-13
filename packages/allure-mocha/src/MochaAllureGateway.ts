import { MochaAllure } from "./MochaAllure";

const METHODS_TO_WRAP: (keyof MochaAllure)[] = [
  "epic",
  "feature",
  "story",
  "suite",
  "parentSuite",
  "subSuite",
  "label",
  "parameter",
  "link",
  "issue",
  "tms",
  "description",
  "descriptionHtml",
  "owner",
  "severity",
  "layer",
  "id",
  "tag",
  "writeEnvironmentInfo",
  "writeCategoriesDefinitions",
  "attachment",
  "testAttachment",
  "logStep",
  "step",
];

export class MochaAllureGateway {
  allureGetter: () => MochaAllure;

  constructor(allureGetter: () => MochaAllure) {
    this.allureGetter = allureGetter;

    METHODS_TO_WRAP.forEach((method) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      this[method] = this.wrapMethod(method);
    });
  }

  private wrapMethod(methodName: keyof MochaAllure) {
    return (...args: any[]) => {
      const allure = this.allureGetter();

      if (!allure) {
        // eslint-disable-next-line no-console
        console.error(
          `MochaAllure: "${methodName}" can't be used in parallel mode! To use Allure Runtime API, please, switch back to single thread mode.`,
        );
        return;
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return allure[methodName](...args);
    };
  }
}
