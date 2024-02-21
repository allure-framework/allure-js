import { Test } from "hermione";
import * as process from "node:process";
import {
  LabelName,
  LinkType,
  MetadataMessage,
  ParameterOptions,
  Stage,
  Status,
  StatusDetails,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";
import {
  HermioneEndStepMessage,
  HermioneMetadataMessage,
  HermioneRuntimeMessageType,
  HermioneStartStepMessage,
} from "./model";

const processSendAsync = (message: unknown): Promise<void> => {
  return new Promise((resolve, reject) => {
    process.send?.(message, undefined, undefined, (err) => {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
};
const sendMetadataMessage = async (currentTest: Test, metadata: MetadataMessage): Promise<void> => {
  await processSendAsync({
    contentType: ALLURE_METADATA_CONTENT_TYPE,
    payload: {
      type: HermioneRuntimeMessageType.METADATA,
      testId: currentTest.id,
      metadata,
    } as HermioneMetadataMessage,
  });
};
const startStep = async (currentTest: Test, name: string): Promise<void> => {
  await processSendAsync({
    contentType: ALLURE_METADATA_CONTENT_TYPE,
    payload: {
      type: HermioneRuntimeMessageType.START_STEP,
      testId: currentTest.id,
      name,
    } as HermioneStartStepMessage,
  });
};
const endStep = async (
  currentTest: Test,
  status: Status,
  statusDetails?: StatusDetails,
  stage?: Stage,
): Promise<void> => {
  await processSendAsync({
    contentType: ALLURE_METADATA_CONTENT_TYPE,
    payload: {
      type: HermioneRuntimeMessageType.END_STEP,
      testId: currentTest.id,
      status,
      stage,
      statusDetails,
    } as HermioneEndStepMessage,
  });
};

export const allure = (currentTest: Test) => ({
  description: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      description: value,
    });
  },

  descriptionHtml: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      descriptionHtml: value,
    });
  },

  attachment: async (content: string | Buffer, type: string, name?: string) => {
    const isBuffer = Buffer.isBuffer(content);
    await sendMetadataMessage(currentTest, {
      attachments: [
        {
          name: name || "Attachment",
          content: isBuffer ? content.toString("base64") : content,
          encoding: isBuffer ? "base64" : "utf8",
          type,
        },
      ],
    });
  },

  parameter: async (name: string, value: any, options?: ParameterOptions) => {
    await sendMetadataMessage(currentTest, {
      parameter: [{ name, value, ...options }],
    });
  },

  link: async (url: string, name?: string, type?: string) => {
    await sendMetadataMessage(currentTest, {
      links: [{ name, url, type }],
    });
  },

  issue: async (url: string, name?: string) => {
    await sendMetadataMessage(currentTest, {
      links: [{ name, url, type: LinkType.ISSUE }],
    });
  },

  tms: async (url: string, name?: string) => {
    await sendMetadataMessage(currentTest, {
      links: [{ name, url, type: LinkType.TMS }],
    });
  },

  label: async (name: string, value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name, value }],
    });
  },

  id: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.ALLURE_ID, value }],
    });
  },

  epic: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.EPIC, value }],
    });
  },

  feature: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.FEATURE, value }],
    });
  },

  story: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.STORY, value }],
    });
  },

  suite: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.SUITE, value }],
    });
  },

  subSuite: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.SUB_SUITE, value }],
    });
  },

  parentSuite: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.PARENT_SUITE, value }],
    });
  },

  owner: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.OWNER, value }],
    });
  },

  severity: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.SEVERITY, value }],
    });
  },

  tag: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.TAG, value }],
    });
  },

  layer: async (value: string) => {
    await sendMetadataMessage(currentTest, {
      labels: [{ name: LabelName.LAYER, value }],
    });
  },

  historyId: async (historyId: string) => {
    await sendMetadataMessage(currentTest, {
      historyId,
    });
  },

  testCaseId: async (testCaseId: string) => {
    await sendMetadataMessage(currentTest, {
      testCaseId,
    });
  },

  displayName: async (displayName: string) => {
    await sendMetadataMessage(currentTest, {
      displayName,
    });
  },

  step: async (name: string, body: () => Promise<any>) => {
    await startStep(currentTest, name);

    try {
      await body();

      await endStep(currentTest, Status.PASSED);
    } catch (err) {
      const stepStatus = /AssertionError/.test((err as any).constructor.name) ? Status.FAILED : Status.BROKEN;

      await endStep(currentTest, stepStatus, {
        message: (err as Error).message,
        trace: (err as Error).stack,
      });

      throw err;
    }
  },
});
