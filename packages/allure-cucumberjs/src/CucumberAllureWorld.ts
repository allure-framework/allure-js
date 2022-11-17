import process from "node:process";
import { World } from "@cucumber/cucumber";
import {
  AllureStep,
  Attachment,
  AttachmentMetadata,
  AttachmentOptions,
  ContentType,
  ExecutableItem,
  ExecutableItemWrapper,
  Label,
  LabelName,
  Link,
  LinkType,
  ParameterOptions,
  Stage,
  Status,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";

export type CucumberAttachmentStepMetadata = Omit<ExecutableItem, "steps" | "parameters">;

export interface CucumberAttachmentMetadata extends AttachmentMetadata {
  step?: CucumberAttachmentStepMetadata;
  descriptionHtml?: string;
}

export interface CucumberExecutable {
  label(label: string, value: string): void | Promise<void>;

  link(url: string, name?: string, type?: string): void | Promise<void>;

  parameter(name: string, value: string, options?: ParameterOptions): void | Promise<void>;

  epic(epic: string): void | Promise<void>;

  feature(feature: string): void | Promise<void>;

  story(story: string): void | Promise<void>;

  suite(name: string): void | Promise<void>;

  parentSuite(name: string): void | Promise<void>;

  subSuite(name: string): void | Promise<void>;

  owner(owner: string): void | Promise<void>;

  severity(severity: string): void | Promise<void>;

  tag(tag: string): void | Promise<void>;

  issue(issue: string, url: string): void | Promise<void>;

  tms(issue: string, url: string): void | Promise<void>;

  attachment(
    name: string,
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
  ): void | Promise<void>;
}

export class CucumberWorldStep implements CucumberExecutable {
  name: string = "";

  attachments: Attachment[] = [];

  metadata: CucumberAttachmentMetadata = {
    labels: [],
    parameter: [],
  };

  constructor(name: string) {
    this.name = name;
  }

  label(label: string, value: string): void {
    this.metadata.labels?.push({
      name: label,
      value,
    });
  }

  link(url: string, name?: string, type?: string): void {
    this.metadata.links?.push({
      name,
      url,
      type,
    });
  }

  parameter(name: string, value: string, options?: ParameterOptions): void {
    this.metadata.parameter?.push({
      name,
      value,
      hidden: options?.hidden || false,
      excluded: options?.excluded || false,
    });
  }

  epic(epic: string) {
    this.label(LabelName.EPIC, epic);
  }

  feature(feature: string) {
    this.label(LabelName.FEATURE, feature);
  }

  story(story: string) {
    this.label(LabelName.STORY, story);
  }

  suite(name: string) {
    this.label(LabelName.SUITE, name);
  }

  parentSuite(name: string) {
    this.label(LabelName.PARENT_SUITE, name);
  }

  subSuite(name: string) {
    this.label(LabelName.SUB_SUITE, name);
  }

  owner(owner: string) {
    this.label(LabelName.OWNER, owner);
  }

  severity(severity: string) {
    this.label(LabelName.SEVERITY, severity);
  }

  tag(tag: string) {
    this.label(LabelName.TAG, tag);
  }

  issue(name: string, url: string) {
    this.link(url, name, LinkType.ISSUE);
  }

  tms(name: string, url: string) {
    this.link(url, name, LinkType.TMS);
  }

  attachment(source: string | Buffer, type: string): void {
    this.attachments.push({
      name: "attachment",
      source: source.toString(),
      type,
    });
  }

  async start(
    body: (step: CucumberWorldStep) => any | Promise<any>,
  ): Promise<CucumberAttachmentMetadata> {
    const startDate = new Date().getTime();

    try {
      const res = body.call(this, this);
      const stepResult = res instanceof Promise ? await res : res;

      return {
        ...this.metadata,
        step: {
          name: this.name,
          start: startDate,
          stop: new Date().getTime(),
          stage: Stage.FINISHED,
          status: Status.PASSED,
          statusDetails: {},
          attachments: this.attachments,
        },
      };
    } catch (err) {
      return {
        ...this.metadata,
        step: {
          name: this.name,
          start: startDate,
          stop: new Date().getTime(),
          stage: Stage.FINISHED,
          status: Status.FAILED,
          statusDetails:
            err instanceof Error
              ? {
                  message: err.message,
                  trace: err.stack,
                }
              : {},
          attachments: this.attachments,
        },
      };
    }
  }
}

export class CucumberAllureWorld extends World implements Omit<CucumberExecutable, "attachment"> {
  public async label(label: string, value: string) {
    const msgBody: CucumberAttachmentMetadata = {
      labels: [
        {
          name: label,
          value,
        },
      ],
    };

    await this.attach(JSON.stringify(msgBody), ALLURE_METADATA_CONTENT_TYPE);
  }

  public async link(url: string, name?: string, type?: string): Promise<void> {
    const msgBody: CucumberAttachmentMetadata = {
      links: [
        {
          name,
          url,
          type,
        },
      ],
    };

    await this.attach(JSON.stringify(msgBody), ALLURE_METADATA_CONTENT_TYPE);
  }

  public async parameter(name: string, value: string, options?: ParameterOptions): Promise<void> {
    const msgBody: CucumberAttachmentMetadata = {
      parameter: [
        {
          name,
          value,
          hidden: options?.hidden || false,
          excluded: options?.excluded || false,
        },
      ],
    };

    await this.attach(JSON.stringify(msgBody), ALLURE_METADATA_CONTENT_TYPE);
  }

  public async description(markdown: string): Promise<void> {
    const msgBody: CucumberAttachmentMetadata = {
      description: markdown,
    };

    await this.attach(JSON.stringify(msgBody), ALLURE_METADATA_CONTENT_TYPE);
  }

  public async descriptionHtml(html: string): Promise<void> {
    const msgBody: CucumberAttachmentMetadata = {
      descriptionHtml: html,
    };

    await this.attach(JSON.stringify(msgBody), ALLURE_METADATA_CONTENT_TYPE);
  }

  async step(
    name: string,
    body: (this: CucumberWorldStep, step: CucumberWorldStep) => Promise<any>,
  ) {
    const testStep = new CucumberWorldStep(name);
    const msgBody = await testStep.start(body);

    await this.attach(JSON.stringify(msgBody), ALLURE_METADATA_CONTENT_TYPE);
  }

  public async epic(epic: string) {
    await this.label(LabelName.EPIC, epic);
  }

  public async feature(feature: string) {
    await this.label(LabelName.FEATURE, feature);
  }

  public async story(story: string) {
    await this.label(LabelName.STORY, story);
  }

  public async suite(name: string) {
    await this.label(LabelName.SUITE, name);
  }

  public async parentSuite(name: string) {
    await this.label(LabelName.PARENT_SUITE, name);
  }

  public async subSuite(name: string) {
    await this.label(LabelName.SUB_SUITE, name);
  }

  public async owner(owner: string) {
    await this.label(LabelName.OWNER, owner);
  }

  public async severity(severity: string) {
    await this.label(LabelName.SEVERITY, severity);
  }

  public async tag(tag: string) {
    await this.label(LabelName.TAG, tag);
  }

  public async issue(name: string, url: string) {
    await this.link(url, name, LinkType.ISSUE);
  }

  public async tms(name: string, url: string) {
    await this.link(url, name, LinkType.TMS);
  }

  // TODO: send it through attachments api too
  // public writeEnvironmentInfo(info: Record<string, string>): void {
  //   this.runtime.writeEnvironmentInfo(info);
  // }

  // public writeCategoriesDefinitions(categories: Category[]): void {
  //   this.runtime.writeCategoriesDefinitions(categories);
  // }
}
