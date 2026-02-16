import { World } from "@cucumber/cucumber";
import * as allure from "allure-js-commons";
import type { ParameterOptions, StatusDetails } from "allure-js-commons";

/**
 * @deprecated please use api exported by "allure-js-commons" instead.
 */
export interface AllureCucumberLegacyApi {
  label: (name: string, value: string) => Promise<void>;
  link: (type: string, url: string, name?: string) => Promise<void>;
  parameter: (name: string, value: string, options?: ParameterOptions) => Promise<void>;
  description: (markdown: string) => Promise<void>;
  descriptionHtml: (html: string) => Promise<void>;
  testCaseId: (id: string) => Promise<void>;
  historyId: (id: string) => Promise<void>;
  allureId: (id: string) => Promise<void>;
  displayName: (name: string) => Promise<void>;
  attachment: (name: string, content: Buffer | string, type: string) => Promise<void>;
  globalAttachment: (name: string, content: Buffer | string, type: string) => Promise<void>;
  globalError: (details: StatusDetails) => Promise<void>;
  issue: (name: string, url: string) => Promise<void>;
  tms: (name: string, url: string) => Promise<void>;
  epic: (name: string) => Promise<void>;
  feature: (name: string) => Promise<void>;
  story: (name: string) => Promise<void>;
  suite: (name: string) => Promise<void>;
  parentSuite: (name: string) => Promise<void>;
  subSuite: (name: string) => Promise<void>;
  owner: (name: string) => Promise<void>;
  severity: (name: string) => Promise<void>;
  layer: (name: string) => Promise<void>;
  tag: (name: string) => Promise<void>;
  step: (name: string, body: () => Promise<void>) => Promise<void>;
}

/**
 * @deprecated please use api exported by "allure-js-commons" instead.
 */
export class AllureCucumberWorld extends World implements AllureCucumberLegacyApi {
  /**
   * @deprecated please use import { label } from "allure-js-commons" instead.
   */
  label = (name: string, value: string) => Promise.resolve(allure.label(name, value));
  /**
   * @deprecated please use import { link } from "allure-js-commons" instead.
   */
  link = (type: string, url: string, name?: string) => Promise.resolve(allure.link(url, name, type));
  /**
   * @deprecated please use import { parameter } from "allure-js-commons" instead.
   */
  parameter = (name: string, value: string, options?: ParameterOptions) =>
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
  attachment = (name: string, content: Buffer | string, type: string) =>
    Promise.resolve(allure.attachment(name, content, { contentType: type }));
  globalAttachment = (name: string, content: Buffer | string, type: string) =>
    Promise.resolve(allure.globalAttachment(name, content, { contentType: type }));
  globalError = (details: StatusDetails) => Promise.resolve(allure.globalError(details));
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
