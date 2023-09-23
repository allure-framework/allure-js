import { AllureRuntime } from "./AllureRuntime";
import {
  AttachmentMetadata,
  ContentType,
  ExecutableItem,
  LabelName,
  LinkType,
  MetadataMessage,
  ParameterOptions,
  Stage,
  Status,
  StepMetadata,
} from "./model";

export type StepBodyFunction<T = any> = (
  this: AllureCommandStepExecutable,
  step: AllureCommandStepExecutable,
) => T | Promise<T>;

export interface AllureCommandStep<T = MetadataMessage> {
  name: string;

  attachments: AttachmentMetadata[];

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
    options: ContentType | string,
  ): void | Promise<void>;

  description(content: string): void | Promise<void>;
}

export class AllureCommandStepExecutable implements AllureCommandStep {
  name: string = "";

  attachments: AttachmentMetadata[] = [];

  metadata: MetadataMessage = {};

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Recursively writes attachments from the given step and all it's children
   * Mutates given step object!
   */
  static toExecutableItem(runtime: AllureRuntime, stepMetadata: StepMetadata): ExecutableItem {
    const executable: ExecutableItem = {
      ...stepMetadata,
      attachments: [],
      steps: [],
    };

    if (stepMetadata.attachments.length > 0) {
      stepMetadata.attachments.forEach((attachment) => {
        const attachmentContent = Buffer.from(attachment.content, attachment.encoding);
        const attachmentFilename = runtime.writeAttachment(
          attachmentContent,
          attachment.type,
          attachment.encoding,
        );

        executable.attachments.push({
          name: attachment.name,
          type: attachment.type,
          source: attachmentFilename,
        });
      });
    }

    if (stepMetadata.steps.length > 0) {
      executable.steps = stepMetadata.steps.map((nestedStep) =>
        AllureCommandStepExecutable.toExecutableItem(runtime, nestedStep),
      );
    }

    return executable;
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

  parameter(name: string, value: any, options?: ParameterOptions): void {
    if (!this.metadata.parameter) {
      this.metadata.parameter = [];
    }

    this.metadata.parameter.push({
      name,
      value: JSON.stringify(value),
      excluded: options?.excluded || false,
      mode: options?.mode,
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

  attach(content: string | Buffer, type: string): void {
    const isBuffer = Buffer.isBuffer(content);

    this.attachments.push({
      name: "attachment",
      content: isBuffer ? content.toString("base64") : content,
      encoding: isBuffer ? "base64" : "utf8",
      type,
    });
  }

  description(content: string): void {
    this.metadata.description = content;
  }

  async step(name: string, body: StepBodyFunction): Promise<void> {
    if (!this.metadata.steps) {
      this.metadata.steps = [];
    }

    const nestedStep = new AllureCommandStepExecutable(name);
    // eslint-disable-next-line @typescript-eslint/require-await
    await nestedStep.run(body, async ({ labels = [], links = [], parameter = [], steps = [] }) => {
      this.metadata.labels = (this.metadata.labels || []).concat(labels);
      this.metadata.links = (this.metadata.links || []).concat(links);
      this.metadata.parameter = (this.metadata.parameter || []).concat(parameter);
      this.metadata.steps = (this.metadata.steps || []).concat(steps);
    });
  }

  async start(body: StepBodyFunction): Promise<MetadataMessage> {
    return await new Promise<MetadataMessage>((resolve) =>
      // eslint-disable-next-line @typescript-eslint/require-await
      this.run(body, async (result) => resolve(result)),
    );
  }

  async run(
    body: StepBodyFunction,
    messageEmitter: (message: MetadataMessage) => Promise<void>,
  ): Promise<void> {
    const startDate = new Date().getTime();

    try {
      await body.call(this, this);

      const { steps = [], description = "", descriptionHtml = "", ...metadata } = this.metadata;

      await messageEmitter({
        ...metadata,
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
            steps,
            description,
          },
        ],
      });
    } catch (e: any) {
      const { steps = [], description = "", descriptionHtml = "", ...metadata } = this.metadata;

      await messageEmitter({
        ...metadata,
        steps: [
          {
            name: this.name,
            start: startDate,
            stop: new Date().getTime(),
            stage: Stage.FINISHED,
            status: Status.BROKEN,
            statusDetails: {
              message: e.message,
              trace: e.trace,
            },
            attachments: this.attachments,
            parameters: [],
            steps,
            description,
          },
        ],
      });

      throw e;
    }
  }
}
