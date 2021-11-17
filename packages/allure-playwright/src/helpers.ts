import { TestInfo } from "@playwright/test";
import { Label, LabelName, LinkType } from "allure-js-commons";

export const ContentTypes = {
  label: "allure/label",
  link: "allure/link",
};

export function label(testInfo: TestInfo, label: Label) {
  testInfo.attachments.push({
    name: label.name,
    contentType: ContentTypes.label,
    path: label.value,
  });
}

export function epic(testInfo: TestInfo, epic: string) {
  label(testInfo, {
    name: LabelName.EPIC,
    value: epic,
  });
}

export function feature(testInfo: TestInfo, feature: string) {
  label(testInfo, {
    name: LabelName.FEATURE,
    value: feature,
  });
}

export function story(testInfo: TestInfo, story: string): void {
  label(testInfo, {
    name: LabelName.STORY,
    value: story,
  });
}

export function suite(testInfo: TestInfo, name: string): void {
  label(testInfo, {
    name: LabelName.SUITE,
    value: name,
  });
}

export function parentSuite(testInfo: TestInfo, name: string) {
  label(testInfo, {
    name: LabelName.PARENT_SUITE,
    value: name,
  });
}

export function subSuite(testInfo: TestInfo, name: string) {
  label(testInfo, {
    name: LabelName.SUB_SUITE,
    value: name,
  });
}

export function owner(testInfo: TestInfo, owner: string) {
  label(testInfo, {
    name: LabelName.OWNER,
    value: owner,
  });
}

export function severity(testInfo: TestInfo, severity: string) {
  label(testInfo, {
    name: LabelName.SEVERITY,
    value: severity,
  });
}

export function tag(testInfo: TestInfo, tag: string) {
  label(testInfo, {
    name: LabelName.SEVERITY,
    value: tag,
  });
}


interface LinkData {
  url: string;
  name?: string;
}

export function link(testInfo: TestInfo, url: string, name?: string, type?: LinkType) {
  testInfo.attachments.push({
    name: type || "link",
    contentType: ContentTypes.link,
    path: JSON.stringify({
      url,
      name: name || undefined,
    } as LinkData),
  });
}

export function issue(testInfo: TestInfo, url: string, name: string) {
  link(testInfo, url, name, LinkType.ISSUE);
}

export function tms(testInfo: TestInfo, url: string, name: string) {
  link(testInfo, url, name, LinkType.TMS);
}

export { LabelName, LinkType, LinkData };
