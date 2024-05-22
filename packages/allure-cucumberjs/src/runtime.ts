import { IWorld, IWorldOptions } from "@cucumber/cucumber";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/internal";
import { MessageTestRuntime, RuntimeMessage } from "allure-js-commons/sdk/node";

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
