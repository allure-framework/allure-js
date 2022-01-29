import test from "@playwright/test";
import { Label, LabelName, Link, LinkType } from "allure-js-commons";

export const ALLURE_METADATA_CONTENT_TYPE = "application/vnd.allure.metadata+json";
export interface Metadata {
  labels?: Label[];
  links?: Link[];
  description?: string;
}

export class allure {
  static addMetadataAttachment(metadata: Metadata) {
    test.info().attach("allure-metadata.json", {
      contentType: ALLURE_METADATA_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(metadata), "utf8"),
    });
  }

  static label(label: Label | Label[]) {
    this.addMetadataAttachment({
      labels: Array.isArray(label) ? label : [label],
    });
  }

  static description(value: string) {
    this.addMetadataAttachment({
      description: value,
    });
  }

  static link(link: Link) {
    this.addMetadataAttachment({
      links: Array.isArray(link) ? link : [link],
    });
  }

  static id(id: string) {
    this.label({
      value: id,
      name: LabelName.AS_ID,
    });
  }

  static epic(epic: string) {
    this.label({
      name: LabelName.EPIC,
      value: epic,
    });
  }

  static feature(epic: string) {
    this.label({
      name: LabelName.FEATURE,
      value: epic,
    });
  }

  static story(story: string): void {
    this.label({
      name: LabelName.STORY,
      value: story,
    });
  }

  static suite(name: string): void {
    this.label({
      name: LabelName.SUITE,
      value: name,
    });
  }

  static parentSuite(name: string) {
    this.label({
      name: LabelName.PARENT_SUITE,
      value: name,
    });
  }

  static subSuite(name: string) {
    this.label({
      name: LabelName.SUB_SUITE,
      value: name,
    });
  }

  static owner(owner: string) {
    this.label({
      name: LabelName.OWNER,
      value: owner,
    });
  }

  static severity(severity: string) {
    this.label({
      name: LabelName.SEVERITY,
      value: severity,
    });
  }

  static tag(tag: string) {
    this.label({
      name: LabelName.TAG,
      value: tag,
    });
  }

  static issue(issueData: Omit<Link, "type">) {
    this.link({
      url: issueData.url,
      name: issueData.name,
      type: LinkType.ISSUE,
    });
  }

  static tms(issueData: Omit<Link, "type">) {
    this.link({
      url: issueData.url,
      name: issueData.name,
      type: LinkType.TMS,
    });
  }
}

export { LabelName } from "allure-js-commons";
