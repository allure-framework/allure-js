import { AllureRuntime } from "./AllureRuntime";
import {
  Attachment,
  AttachmentMetadata,
  AttachmentOptions,
  ContentType,
  ExecutableItem,
  LabelName,
  LinkType,
  ParameterOptions,
  Stage,
  Status,
} from "./model";

export type StepBodyFunction = (
  this: AllureCommandStepExecutable,
  step: AllureCommandStepExecutable,
) => any | Promise<any>;

export interface AllureCommandStep<T = AttachmentMetadata> {
  name: string;

  attachments: Attachment[];

  metadata: T;

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

  attach(
    name: string,
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
  ): void | Promise<void>;
}

// TODO: think about the class name
export class AllureCommandStepExecutable implements AllureCommandStep {
  name: string = "";

  attachments: Attachment[] = [];

  metadata: AttachmentMetadata = {};

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Recursively writes attachments from the given step and all it's children
   * Mutates given step object!
   */
  static writeStepAttachments(runtime: AllureRuntime, step: ExecutableItem) {
    if (step.attachments.length > 0) {
      step.attachments.forEach((attachment) => {
        const encoding = /(text|application)/.test(attachment.type) ? "utf8" : "base64";
        const attachmentContent = Buffer.from(attachment.source, encoding);
        const attachmentFilename = runtime.writeAttachment(
          attachmentContent,
          attachment.type,
          encoding,
        );

        attachment.source = attachmentFilename;
      });
    }

    if (step.steps.length > 0) {
      step.steps.forEach((nestedStep) => {
        AllureCommandStepExecutable.writeStepAttachments(runtime, nestedStep);
      });
    }
  }

  label(label: string, value: string): void {
    if (!this.metadata.labels) {
      this.metadata.labels = [];
    }

    this.metadata.labels.push({
      name: label,
      value,
    });
  }

  link(url: string, name?: string, type?: string): void {
    if (!this.metadata.links) {
      this.metadata.links = [];
    }

    this.metadata.links.push({
      name,
      url,
      type,
    });
  }

  parameter(name: string, value: string, options?: ParameterOptions): void {
    if (!this.metadata.parameter) {
      this.metadata.parameter = [];
    }

    this.metadata.parameter.push({
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

  attach(source: string | Buffer, type: string): void {
    this.attachments.push({
      name: "attachment",
      source: Buffer.isBuffer(source) ? source.toString("base64") : source,
      type,
    });
  }

  async step(name: string, body: StepBodyFunction): Promise<void> {
    if (!this.metadata.steps) {
      this.metadata.steps = [];
    }

    const nestedStep = new AllureCommandStepExecutable(name);
    const {
      labels = [],
      links = [],
      parameter = [],
      steps = [],
    } = await nestedStep.start(body);

    this.metadata.labels = (this.metadata.labels || []).concat(labels);
    this.metadata.links = (this.metadata.links || []).concat(links);
    this.metadata.parameter = (this.metadata.parameter || []).concat(parameter);
    this.metadata.steps = (this.metadata.steps || []).concat(steps);
  }

  async start(body: StepBodyFunction): Promise<AttachmentMetadata> {
    const startDate = new Date().getTime();

    try {
      const res = body.call(this, this);

      await res;

      return {
        ...this.metadata,
        steps: [
          {
            name: this.name,
            start: startDate,
            stop: new Date().getTime(),
            stage: Stage.FINISHED,
            status: Status.PASSED,
            statusDetails: {},
            attachments: this.attachments,
            parameters: [],
            description: this.metadata.description || "",
            descriptionHtml: this.metadata.descriptionHtml || "",
            steps: this.metadata.steps || [],
          },
        ],
      };
    } catch (err) {
      return {
        ...this.metadata,
        steps: [
          {
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
            description: this.metadata.description || "",
            descriptionHtml: this.metadata.descriptionHtml || "",
            parameters: [],
            steps: this.metadata.steps || [],
          },
        ],
      };
    }
  }
}
