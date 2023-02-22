export class ParallelMochaAllure {
  constructor() {
    const methods = [
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
      "ims",
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
      "logStep",
      "step",
    ];

    methods.forEach((method) => {
      // eslint-disable-next-line
      // @ts-ignore
      this[method] = this.stubMethod(method);
    });
  }

  private stubMethod(methodName: string) {
    return () =>
      // eslint-disable-next-line
      console.error(
        `MochaAllure: "${methodName}" can't be used in parallel mode! To use Allure Runtime API, please, switch back to single thread mode.`,
      );
  }
}
