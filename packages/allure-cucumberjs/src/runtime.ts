import type { IWorld, IWorldOptions } from "@cucumber/cucumber";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class AllureCucumberTestRuntime extends MessageTestRuntime implements IWorld {
  public readonly attach: IWorldOptions["attach"];
  public readonly log: IWorldOptions["log"];
  public readonly parameters: IWorldOptions["parameters"];

  constructor({ attach, log, parameters }: IWorldOptions) {
    super();
    this.attach = attach;
    this.log = log;
    this.parameters = parameters;
  }

  async sendMessage(message: RuntimeMessage) {
    this.attach(JSON.stringify(message), ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE as string);
    await Promise.resolve();
  }
}
