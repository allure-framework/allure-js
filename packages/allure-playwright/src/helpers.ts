import { randomUUID } from "crypto";
import test from "@playwright/test";
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

  /**
   * @deprecated use parameter instead
   */
  static async addParameter(name: string, value: string, options?: ParameterOptions) {
    await this.parameter(name, value, options);
  }
}

export { LabelName } from "allure-js-commons";
