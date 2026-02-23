import * as allure from "allure-js-commons";
import type { Label, Link } from "allure-js-commons";

/**
 * @deprecated please use api exported by "allure-js-commons" instead.
 */
export interface AllurePlaywrightLegacyApi {
  label: (name: string, value: string) => Promise<void>;
  labels: (...labels: Label[]) => Promise<void>;
  link: (type: string, url: string, name?: string) => Promise<void>;
  links: (...links: Link[]) => Promise<void>;
  parameter: (
    name: string,
    value: string,
    options?: { excluded?: boolean; mode?: "hidden" | "masked" | "default" },
  ) => Promise<void>;
  description: (markdown: string) => Promise<void>;
  descriptionHtml: (html: string) => Promise<void>;
  testCaseId: (id: string) => Promise<void>;
  historyId: (id: string) => Promise<void>;
  allureId: (id: string) => Promise<void>;
  displayName: (name: string) => Promise<void>;
  attachment: (name: string, content: Buffer | string, type: string) => Promise<void>;
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
  tags: (...tagsList: string[]) => Promise<void>;
  step: (name: string, body: () => Promise<void>) => Promise<void>;
}

/**
 * @deprecated please use api exported by "allure-js-commons" instead.
 */
export const allurePlaywrightLegacyApi: AllurePlaywrightLegacyApi = {
  /**
   * @deprecated please use import { label } from "allure-js-commons" instead.
   */
  label: (...args) => Promise.resolve(allure.label(...args)),
  /**
   * @deprecated please use import { labels } from "allure-js-commons" instead.
   */
  labels: (...labels) => Promise.resolve(allure.labels(...labels)),
  /**
   * @deprecated please use import { link } from "allure-js-commons" instead.
   */
  link: (type, url, name) => Promise.resolve(allure.link(url, name, type)),
  /**
   * @deprecated please use import { links } from "allure-js-commons" instead.
   */
  links: (...links) => Promise.resolve(allure.links(...links)),
  /**
   * @deprecated please use import { parameter } from "allure-js-commons" instead.
   */
  parameter: (name, value, options) => Promise.resolve(allure.parameter(name, value, options)),
  /**
   * @deprecated please use import { description } from "allure-js-commons" instead.
   */
  description: (...args) => Promise.resolve(allure.description(...args)),
  /**
   * @deprecated please use import { descriptionHtml } from "allure-js-commons" instead.
   */
  descriptionHtml: (html) => Promise.resolve(allure.descriptionHtml(html)),
  /**
   * @deprecated please use import { testCaseId } from "allure-js-commons" instead.
   */
  testCaseId: (id) => Promise.resolve(allure.testCaseId(id)),
  /**
   * @deprecated please use import { historyId } from "allure-js-commons" instead.
   */
  historyId: (id) => Promise.resolve(allure.historyId(id)),
  /**
   * @deprecated please use import { allureId } from "allure-js-commons" instead.
   */
  allureId: (id) => Promise.resolve(allure.allureId(id)),
  /**
   * @deprecated please use import { displayName } from "allure-js-commons" instead.
   */
  displayName: (name) => Promise.resolve(allure.displayName(name)),
  /**
   * @deprecated please use import { attachment } from "allure-js-commons" instead.
   */
  attachment: (name, content, type) => Promise.resolve(allure.attachment(name, content, { contentType: type })),
  /**
   * @deprecated please use import { issue } from "allure-js-commons" instead.
   */
  issue: (name, url) => Promise.resolve(allure.issue(url, name)),
  /**
   * @deprecated please use import { tms } from "allure-js-commons" instead.
   */
  tms: (name, url) => Promise.resolve(allure.tms(url, name)),
  /**
   * @deprecated please use import { epic } from "allure-js-commons" instead.
   */
  epic: (name) => Promise.resolve(allure.epic(name)),
  /**
   * @deprecated please use import { feature } from "allure-js-commons" instead.
   */
  feature: (name) => Promise.resolve(allure.feature(name)),
  /**
   * @deprecated please use import { story } from "allure-js-commons" instead.
   */
  story: (name) => Promise.resolve(allure.story(name)),
  /**
   * @deprecated please use import { suite } from "allure-js-commons" instead.
   */
  suite: (name) => Promise.resolve(allure.suite(name)),
  /**
   * @deprecated please use import { parentSuite } from "allure-js-commons" instead.
   */
  parentSuite: (name) => Promise.resolve(allure.parentSuite(name)),
  /**
   * @deprecated please use import { subSuite } from "allure-js-commons" instead.
   */
  subSuite: (name) => Promise.resolve(allure.subSuite(name)),
  /**
   * @deprecated please use import { owner } from "allure-js-commons" instead.
   */
  owner: (name) => Promise.resolve(allure.owner(name)),
  /**
   * @deprecated please use import { severity } from "allure-js-commons" instead.
   */
  severity: (name) => Promise.resolve(allure.severity(name)),
  /**
   * @deprecated please use import { layer } from "allure-js-commons" instead.
   */
  layer: (name) => Promise.resolve(allure.layer(name)),
  /**
   * @deprecated please use import { tag } from "allure-js-commons" instead.
   */
  tag: (name) => Promise.resolve(allure.tag(name)),
  /**
   * @deprecated please use import { tags } from "allure-js-commons" instead.
   */
  tags: (...tagsList) => Promise.resolve(allure.tags(...tagsList)),
  /**
   * @deprecated please use import { step } from "allure-js-commons" instead.
   */
  step: (name, body) => Promise.resolve(allure.step(name, body)),
};
