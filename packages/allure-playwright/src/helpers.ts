// FIXME: we do many monkey patching there, so better to move the logic to separate file and ignore some rules in it
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { randomUUID } from "crypto";
import test, { Page } from "@playwright/test";
import {
  AttachmentOptions,
  ContentType,
  Label,
  LabelName,
  Link,
  LinkType,
  MetadataMessage,
  ParameterOptions,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";
import { JSHandle } from "playwright-core";

const elementsHandlesSelectorsCache = new Map<string, { fullPath: string; type: string }>();

const getSelectorType = (selector: string): "css" | "xpath" => {
  if (selector.startsWith("//" || selector.toLocaleLowerCase().startsWith("(xpath=//"))) {
    return "xpath";
  }

  return "css";
};

const makePageMethodProxy = (
  Target: Page,
  method: keyof Page,
  urlGetter: () => Promise<string>,
  saveOriginalSelector?: boolean,
) => {
  const originalMethod = Target[method];

  // @ts-ignore
  if (originalMethod.proxy) {
    return;
  }

  // @ts-ignore
  Target[method] = async function (...args: any[]) {
    const url = await urlGetter();
    const selectorData = {
      fullPath: args[0],
      type: getSelectorType(args[0] as string),
    };

    // @ts-ignore
    const res = await originalMethod.call(this, ...args);

    if (!saveOriginalSelector) {
      elementsHandlesSelectorsCache.set(res._guid as string, selectorData);
    }

    await allure.addMetadataAttachment({
      allureInspectorEntry: {
        ...selectorData,
        urls: [url],
      },
    });

    return res;
  };
  // @ts-ignore
  Target[method].proxy = true;
};
const makeElementHandleMethodProxy = (
  Target: JSHandle,
  method: keyof JSHandle,
  urlGetter: () => Promise<string>,
) => {
  const originalMethod = Target[method];

  // @ts-ignore
  if (originalMethod.proxy) {
    return;
  }

  // @ts-ignore
  Target[method] = async function (...args: any[]) {
    const url = await urlGetter();
    const el = this.asElement();
    // @ts-ignore
    const selector = elementsHandlesSelectorsCache.get(el!._guid as string)!;

    await allure.addMetadataAttachment({
      allureInspectorEntry: {
        ...selector,
        urls: [url],
      },
    });

    // @ts-ignore
    return originalMethod.call(this, ...args);
  };
  // @ts-ignore
  Target[method].proxy = true;
};
const makeLocatorMethodProxy = (
  Target: JSHandle,
  method: keyof JSHandle,
  urlGetter: () => Promise<string>,
) => {
  const originalMethod = Target[method];

  // @ts-ignore
  if (originalMethod.proxy) {
    return;
  }

  // @ts-ignore
  Target[method] = function (...args: any[]) {
    // @ts-ignore
    const selector = this._selector as string;
    // @ts-ignore
    const url = this._frame.url() as string;

    allure.addMetadataAttachment({
      allureInspectorEntry: {
        fullPath: selector,
        type: getSelectorType(selector),
        urls: [url],
      },
    });

    // @ts-ignore
    return originalMethod.call(this, ...args);
  };
  // @ts-ignore
  Target[method].proxy = true;
};


export class allure {
  static async logStep(name: string): Promise<void> {
    await this.step(name, async () => {});
  }

  static step<T>(name: string, body: () => Promise<T>): Promise<T> {
    return test.step(name, body);
  }

  static async attachment(
    name: string,
    content: Buffer | string,
    options: ContentType | string | Pick<AttachmentOptions, "contentType">,
  ) {
    const stepName = `allureattach_${randomUUID()}_${name}`;

    const contentType = typeof options === "string" ? options : options.contentType;
    await this.step(stepName, async () => {
      await test.info().attach(stepName, {
        body: content,
        contentType,
      });
    });
  }

  static async addMetadataAttachment(metadata: MetadataMessage) {
    await test.info().attach("allure-metadata.json", {
      contentType: ALLURE_METADATA_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(metadata), "utf8"),
    });
  }

  static async label(label: string, value: string) {
    await this.addMetadataAttachment({
      labels: [{ name: label, value }],
    });
  }

  static labels(...values: Label[]) {
    values.forEach(({ name, value }) => this.label(name, value));
  }

  static async description(value: string) {
    await this.addMetadataAttachment({
      description: value,
    });
  }

  static async link(url: string, name?: string, type?: string) {
    await this.addMetadataAttachment({
      links: [{ url, name, type }],
    });
  }

  static links(...values: Link[]) {
    values.forEach(({ url, name, type }) => this.link(url, name, type));
  }

  static async id(id: string) {
    await this.label(LabelName.ALLURE_ID, id);
  }

  static async epic(epic: string) {
    await this.label(LabelName.EPIC, epic);
  }

  static async feature(epic: string) {
    await this.label(LabelName.FEATURE, epic);
  }

  static async story(story: string) {
    await this.label(LabelName.STORY, story);
  }

  static async suite(name: string) {
    await this.label(LabelName.SUITE, name);
  }

  static async parentSuite(name: string) {
    await this.label(LabelName.PARENT_SUITE, name);
  }

  static async layer(layerName: string) {
    await this.label(LabelName.LAYER, layerName);
  }

  static async subSuite(name: string) {
    await this.label(LabelName.SUB_SUITE, name);
  }

  static async owner(owner: string) {
    await this.label(LabelName.OWNER, owner);
  }

  static async severity(severity: string) {
    await this.label(LabelName.SEVERITY, severity);
  }

  static async tag(tag: string) {
    await this.label(LabelName.TAG, tag);
  }

  static async tags(...values: string[]) {
    await Promise.allSettled(values.map(async (value) => await this.tag(value)));
  }

  static async issue(name: string, url: string) {
    await this.link(url, name, LinkType.ISSUE);
  }

  static async tms(name: string, url: string) {
    await this.link(url, name, LinkType.TMS);
  }

  static async parameter(name: string, value: any, options?: ParameterOptions) {
    await this.addMetadataAttachment({
      parameter: [
        {
          name,
          value,
          ...options,
        },
      ],
    });
  }

  static async attachLogger(page: Page) {
    const urlGetter = () => page.evaluate(() => window.location.href);
    const jsHandleInstanse = await page.$("html");
    const locatorInstanse = page.locator("html");
    // @ts-ignore
    const ChannelOwner = page.__proto__;
    // @ts-ignore
    const JsHandle = jsHandleInstanse.__proto__;
    // @ts-ignore
    const Locator = locatorInstanse.__proto__;

    // @ts-ignore
    const pageMethodsToCacheProxy: (keyof Page)[] = ["waitForSelector", "$", "$$"];
    const pageMethodsToCachelessProxy: (keyof Page)[] = [
      "click",
      "type",
      "press",
      "hover",
      "check",
      "click",
      "dblclick",
      "dispatchEvent",
      "dragAndDrop",
      "fill",
      "focus",
      "selectOption",
      "setChecked",
      "setInputFiles",
      "tap",
      "type",
      "uncheck",
      "textContent",
      "getAttribute",
      "innerText",
      "innerHTML",
      "inputValue",
      "isChecked",
      "isDisabled",
      "isEditable",
      "isEnabled",
      "isHidden",
      "isVisible",
    ];
    const elementHandlerMethodsToProxy = [
      "check",
      "click",
      "dblclick",
      "dispatchEvent",
      "fill",
      "focus",
      "hover",
      "press",
      "selectOption",
      "selectText",
      "setChecked",
      "setInputFiles",
      "tap",
      "type",
      "uncheck",
    ];

    pageMethodsToCacheProxy.forEach((method) => {
      makePageMethodProxy(ChannelOwner, method, urlGetter);
    });
    pageMethodsToCachelessProxy.forEach((method) => {
      makePageMethodProxy(ChannelOwner, method, urlGetter, true);
    });
    elementHandlerMethodsToProxy.forEach((method) => {
      // @ts-ignore
      makeElementHandleMethodProxy(JsHandle, method, urlGetter);
    });
    elementHandlerMethodsToProxy.forEach((method) => {
      // @ts-ignore
      makeLocatorMethodProxy(Locator, method, urlGetter);
    });
  }

  /**
   * @deprecated use parameter instead
   */
  static async addParameter(name: string, value: string, options?: ParameterOptions) {
    await this.parameter(name, value, options);
  }
}

export { LabelName } from "allure-js-commons";
