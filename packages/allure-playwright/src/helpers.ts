import test from "@playwright/test";
import { AttachmentMetadata, LabelName, LinkType, ParameterOptions } from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";

export class allure {
  static addMetadataAttachment(metadata: AttachmentMetadata) {
    test.info().attach("allure-metadata.json", {
      contentType: ALLURE_METADATA_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(metadata), "utf8"),
    });
  }

  static label(label: string, value: string) {
    this.addMetadataAttachment({
      labels: [{ name: label, value }],
    });
  }

  static description(value: string) {
    this.addMetadataAttachment({
      description: value,
    });
  }

  static link(url: string, name?: string, type?: string) {
    this.addMetadataAttachment({
      links: [{ url, name, type }],
    });
  }

  static id(id: string) {
    this.label(LabelName.AS_ID, id);
  }

  static epic(epic: string) {
    this.label(LabelName.EPIC, epic);
  }

  static feature(epic: string) {
    this.label(LabelName.FEATURE, epic);
  }

  static story(story: string): void {
    this.label(LabelName.STORY, story);
  }

  static suite(name: string): void {
    this.label(LabelName.SUITE, name);
  }

  static parentSuite(name: string) {
    this.label(LabelName.PARENT_SUITE, name);
  }

  static layer(layerName: string) {
    this.label(LabelName.LAYER, layerName);
  }

  static subSuite(name: string) {
    this.label(LabelName.SUB_SUITE, name);
  }

  static owner(owner: string) {
    this.label(LabelName.OWNER, owner);
  }

  static severity(severity: string) {
    this.label(LabelName.SEVERITY, severity);
  }

  static tag(tag: string) {
    this.label(LabelName.TAG, tag);
  }

  static issue(name: string, url: string) {
    this.link(url, name, LinkType.ISSUE);
  }

  static tms(name: string, url: string) {
    this.link(url, name, LinkType.TMS);
  }

  static addParameter(name: string, value: string, options?: ParameterOptions) {
    this.addMetadataAttachment({
      parameter: [
        {
          name,
          value,
          ...options,
        },
      ],
    });
  }
}

export { LabelName } from "allure-js-commons";
