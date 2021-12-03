import { TestInfo } from "@playwright/test";
import { Label, LabelName, Link, LinkType } from "allure-js-commons";


export const ALLURE_METADATA_CONTENT_TYPE = "application/vnd.allure.metadata+json";


export interface Metadata {
  labels?: Label[];
  links?: Link[];
}

export class AllurePlaywrightHelper {
  private testInfo!: TestInfo;

  constructor(testInfo: TestInfo) {
    this.testInfo = testInfo;
  }

  addMetataAttachment(metadata: Metadata) {
    this.testInfo.attachments.push({
      name: "allure-metadata.json",
      contentType: ALLURE_METADATA_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(metadata), "utf8"),
    });
  }

  label(label: Label | Label[]) {
    this.addMetataAttachment({
      labels: Array.isArray(label) ? label : [label],
    });
  }

  link(link: Link) {
    this.addMetataAttachment({
      links: Array.isArray(link) ? link : [link],
    });
  }

  id(id: string) {
    this.label({
      value: id,
      name: LabelName.AS_ID,
    });
  }

  epic(epic: string) {
    this.label({
      name: LabelName.EPIC,
      value: epic,
    });
  }

  feature(epic: string) {
    this.label({
      name: LabelName.FEATURE,
      value: epic,
    });
  }

  story(story: string): void {
    this.label({
      name: LabelName.STORY,
      value: story,
    });
  }

  suite(name: string): void {
    this.label({
      name: LabelName.SUITE,
      value: name,
    });
  }

  parentSuite(name: string) {
    this.label({
      name: LabelName.PARENT_SUITE,
      value: name,
    });
  }

  subSuite(name: string) {
    this.label({
      name: LabelName.SUB_SUITE,
      value: name,
    });
  }

  owner(owner: string) {
    this.label({
      name: LabelName.OWNER,
      value: owner,
    });
  }

  severity(severity: string) {
    this.label({
      name: LabelName.SEVERITY,
      value: severity,
    });
  }

  tag(tag: string) {
    this.label({
      name: LabelName.TAG,
      value: tag,
    });
  }

  issue(issueData: Omit<Link, "type">) {
    this.link({
      url: issueData.url,
      name: issueData.name,
      type: LinkType.ISSUE,
    });
  }

  tms(issueData: Omit<Link, "type">) {
    this.link({
      url: issueData.url,
      name: issueData.name,
      type: LinkType.TMS,
    });
  }
}

export const allure = (testInfo: TestInfo) => {
  return new AllurePlaywrightHelper(testInfo);
};

export {LabelName} from "allure-js-commons";
