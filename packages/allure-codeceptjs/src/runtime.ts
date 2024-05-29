import * as allure from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";
import type { AllureCodeceptJsReporter } from "./reporter.js";

export class AllureCodeceptJsTestRuntime extends MessageTestRuntime {
  private readonly reporter: AllureCodeceptJsReporter;

  constructor(reporter: AllureCodeceptJsReporter) {
    super();
    this.reporter = reporter;
  }

  async sendMessage(message: RuntimeMessage) {
    this.reporter.handleRuntimeMessage(message);
    await Promise.resolve();
  }

  /**
   * @deprecated please use import { label } from "allure-js-commons" instead.
   */
  label = (name: string, value: string) => Promise.resolve(allure.label(name, value));
  /**
   * @deprecated please use import { link } from "allure-js-commons" instead.
   */
  link = (type: allure.LinkType, url: string, name?: string) => Promise.resolve(allure.link(url, type, name));
  /**
   * @deprecated please use import { parameter } from "allure-js-commons" instead.
   */
  parameter = (name: string, value: string, options: allure.ParameterOptions) =>
    Promise.resolve(allure.parameter(name, value, options));
  /**
   * @deprecated please use import { description } from "allure-js-commons" instead.
   */
  description = (value: string) => Promise.resolve(allure.description(value));
  /**
   * @deprecated please use import { descriptionHtml } from "allure-js-commons" instead.
   */
  descriptionHtml = (html: string) => Promise.resolve(allure.descriptionHtml(html));
  /**
   * @deprecated please use import { testCaseId } from "allure-js-commons" instead.
   */
  testCaseId = (id: string) => Promise.resolve(allure.testCaseId(id));
  /**
   * @deprecated please use import { historyId } from "allure-js-commons" instead.
   */
  historyId = (id: string) => Promise.resolve(allure.historyId(id));
  /**
   * @deprecated please use import { allureId } from "allure-js-commons" instead.
   */
  allureId = (id: string) => Promise.resolve(allure.allureId(id));
  /**
   * @deprecated please use import { displayName } from "allure-js-commons" instead.
   */
  displayName = (name: string) => Promise.resolve(allure.displayName(name));
  /**
   * @deprecated please use import { attachment } from "allure-js-commons" instead.
   */
  attachment = (name: string, content: string, type: allure.ContentType | string) =>
    Promise.resolve(allure.attachment(name, content, type));
  /**
   * @deprecated please use import { issue } from "allure-js-commons" instead.
   */
  issue = (name: string, url: string) => Promise.resolve(allure.issue(url, name));
  /**
   * @deprecated please use import { tms } from "allure-js-commons" instead.
   */
  tms = (name: string, url: string) => Promise.resolve(allure.tms(url, name));
  /**
   * @deprecated please use import { epic } from "allure-js-commons" instead.
   */
  epic = (name: string) => Promise.resolve(allure.epic(name));
  /**
   * @deprecated please use import { feature } from "allure-js-commons" instead.
   */
  feature = (name: string) => Promise.resolve(allure.feature(name));
  /**
   * @deprecated please use import { story } from "allure-js-commons" instead.
   */
  story = (name: string) => Promise.resolve(allure.story(name));
  /**
   * @deprecated please use import { suite } from "allure-js-commons" instead.
   */
  suite = (name: string) => Promise.resolve(allure.suite(name));
  /**
   * @deprecated please use import { parentSuite } from "allure-js-commons" instead.
   */
  parentSuite = (name: string) => Promise.resolve(allure.parentSuite(name));
  /**
   * @deprecated please use import { subSuite } from "allure-js-commons" instead.
   */
  subSuite = (name: string) => Promise.resolve(allure.subSuite(name));
  /**
   * @deprecated please use import { owner } from "allure-js-commons" instead.
   */
  owner = (name: string) => Promise.resolve(allure.owner(name));
  /**
   * @deprecated please use import { severity } from "allure-js-commons" instead.
   */
  severity = (name: string) => Promise.resolve(allure.severity(name));
  /**
   * @deprecated please use import { layer } from "allure-js-commons" instead.
   */
  layer = (name: string) => Promise.resolve(allure.layer(name));
  /**
   * @deprecated please use import { tag } from "allure-js-commons" instead.
   */
  tag = (name: string) => Promise.resolve(allure.tag(name));
  /**
   * @deprecated please use import { step } from "allure-js-commons" instead.
   */
  step = (name: string, body: () => any) => Promise.resolve(allure.step(name, body));
}
