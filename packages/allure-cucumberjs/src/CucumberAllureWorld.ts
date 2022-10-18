import process from "node:process";
import { World } from "@cucumber/cucumber";
import {
  AllureStep,
  Attachment,
  AttachmentMetadata,
  ExecutableItem,
  ExecutableItemWrapper,
  Label,
  LabelName,
  Link,
  Stage,
  Status,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";

export type CucumberAttachmentStepMetadata = Omit<
  ExecutableItem,
  "description" | "descriptionHtml" | "steps" | "parameters"
>;

export interface CucumberAttachmentMetadata extends AttachmentMetadata {
  workerId?: string;
  step?: CucumberAttachmentStepMetadata;
}

interface CucumberExecutableWrapper {
  label: (name: string, value: string) => void;
  epic: (name: string) => void;
  attachment?: (body: string | Buffer, mimetype: string) => void;
}

export class CucumberStep implements CucumberExecutableWrapper {
  name: string = "";

  attachments: Attachment[] = [];

  metadata: CucumberAttachmentMetadata = {
    workerId: process.env.CUCUMBER_WORKER_ID,
    labels: [],
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

  epic(epic: string) {
    this.label(LabelName.EPIC, epic);
  }

  attachment(source: string | Buffer, type: string): void {
    this.attachments.push({
      name: "attachment",
      source: source.toString(),
      type,
    });
  }

  async start(
    body: (step: CucumberStep) => any | Promise<any>,
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

export class CucumberAllureWorld extends World implements CucumberExecutableWrapper {
  async label(label: string, value: string) {
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

  async epic(epic: string) {
    await this.label(LabelName.EPIC, epic);
  }

  async step(name: string, body: (this: CucumberStep, step: CucumberStep) => Promise<any>) {
    const testStep = new CucumberStep(name);
    const msgBody = await testStep.start(body);

    await this.attach(JSON.stringify(msgBody), ALLURE_METADATA_CONTENT_TYPE);
  }
}
