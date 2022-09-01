import { World } from "@cucumber/cucumber";
import {
  ALLURE_METADATA_CONTENT_TYPE,
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

export type CucumberAttachmentStepMetadata = Omit<
  ExecutableItem,
  "description" | "descriptionHtml" | "steps" | "parameters"
>;

export interface CucumberAttachmentMetadata extends AttachmentMetadata {
  step?: CucumberAttachmentStepMetadata;
}

interface CucumberExecutableWrapper {
  label: (name: string, value: string) => Promise<void>;
  epic: (name: string) => Promise<void>;
  attachment?: (body: string | Buffer, mimetype: string) => Promise<void>;
}

export class CucumberStep implements CucumberExecutableWrapper {
  name: string = "";

  attachments: Attachment[] = [];

  metadata: CucumberAttachmentMetadata = {
    labels: [],
  };

  constructor(name: string) {
    this.name = name;
  }

  label(label: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      this.metadata.labels?.push({
        name: label,
        value,
      });

      return resolve();
    });
  }

  async epic(epic: string) {
    await this.label(LabelName.EPIC, epic);
  }

  async attachment(source: string | Buffer, type: string): Promise<void> {
    return new Promise((resolve) => {
      this.attachments.push({
        name: "attachment",
        source: source.toString(),
        type: type,
      });

      return resolve();
    });
  }

  async start(body: (step: CucumberStep) => Promise<any>): Promise<CucumberAttachmentMetadata> {
    const startDate = new Date().getTime();

    try {
      const stepResult = await body.call(this, this);

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
