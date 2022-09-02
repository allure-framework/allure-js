import { BroadcastChannel } from "node:worker_threads";
import { LabelName } from "allure-js-commons";
import { ParameterOptions } from "allure-js-commons";
import { Parameter } from "allure-js-commons";
import { LinkType } from "allure-js-commons";
import { Link } from "allure-js-commons";
import { Label } from "allure-js-commons";

export type AllureMetadata =
  | {
      type: "label";
      value: Label;
    }
  | {
      type: "description";
      value: string;
    }
  | {
      type: "link";
      value: Link;
    }
  | {
      type: "parameter";
      value: Parameter;
    };

export type AllureMessageType = {
  testId: string;
  data: AllureMetadata;
};

export class allure {
  static sendMessageToReporter(data: AllureMetadata) {
    // @ts-expect-error missing types
    // eslint-disable-next-line no-underscore-dangle
    const testId: string = globalThis.__vitest_worker__.current.id;
    if(!testId){
      return;
    }

    const channel = new BroadcastChannel("allure-meta-broadcast");
    const message: AllureMessageType = {
      data,
      testId: testId,
    };
    channel.postMessage(message);
    channel.close();
  }

  static label(label: Label) {
    this.sendMessageToReporter({
      type: "label",
      value: label,
    });
  }

  static description(value: string) {
    this.sendMessageToReporter({
      type: "description",
      value,
    });
  }

  static link(link: Link) {
    this.sendMessageToReporter({
      type: "link",
      value: link,
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

  static addParameter(name: string, value: string, options?: ParameterOptions) {
    this.sendMessageToReporter({
      type: "parameter",
      value: {
        name,
        value,
        ...options,
      },
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

  static tag(...tags: string[]) {
    for (const tag of tags) {
      this.label({
        name: LabelName.TAG,
        value: tag,
      });
    }
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
