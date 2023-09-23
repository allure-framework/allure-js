import {
  AllureCommandStepExecutable,
  LabelName,
  LinkType,
  MetadataMessage,
  ParameterOptions,
  StepBodyFunction,
} from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";

const id = async (browser: any) => {
  const config = await browser.getConfig();
  return `${config?.id}:${browser.executionContext?.ctx?.currentTest?.id}`;
};

const sendMetadata = async (browser: any, metadata: MetadataMessage): Promise<void> => {
  const testId = await id(browser);
  return new Promise((resolve, reject) => {
    process.send?.(
      {
        type: ALLURE_METADATA_CONTENT_TYPE,
        testId,
        metadata,
      },
      undefined,
      undefined,
      (err) => {
        if (err) {
          return reject(err);
        }

        return resolve();
      },
    );
  });
};

export const allure = (browser: any) => ({
  description: async (value: string) => {
    await sendMetadata(browser, {
      description: value,
    });
  },

  descriptionHtml: async (value: string) => {
    await sendMetadata(browser, {
      descriptionHtml: value,
    });
  },

  attachment: async (content: string | Buffer, type: string) => {
    const isBuffer = Buffer.isBuffer(content);
    await sendMetadata(browser, {
      attachments: [
        {
          name: "Attachment",
          content: isBuffer ? content.toString("base64") : content,
          encoding: isBuffer ? "base64" : "utf8",
          type,
        },
      ],
    });
  },

  parameter: async (name: string, value: any, options?: ParameterOptions) => {
    await sendMetadata(browser, {
      parameter: [{ name, value, ...options }],
    });
  },

  link: async (url: string, name?: string, type?: string) => {
    await sendMetadata(browser, {
      links: [{ name, url, type }],
    });
  },

  issue: async (url: string, name?: string) => {
    await sendMetadata(browser, {
      links: [{ name, url, type: LinkType.ISSUE }],
    });
  },

  tms: async (url: string, name?: string) => {
    await sendMetadata(browser, {
      links: [{ name, url, type: LinkType.TMS }],
    });
  },

  label: async (name: string, value: string) => {
    await sendMetadata(browser, {
      labels: [{ name, value }],
    });
  },

  id: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.ALLURE_ID, value }],
    });
  },

  epic: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.EPIC, value }],
    });
  },

  feature: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.FEATURE, value }],
    });
  },

  story: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.STORY, value }],
    });
  },

  suite: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.SUITE, value }],
    });
  },

  subSuite: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.SUB_SUITE, value }],
    });
  },

  parentSuite: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.PARENT_SUITE, value }],
    });
  },

  owner: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.OWNER, value }],
    });
  },

  severity: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.SEVERITY, value }],
    });
  },

  tag: async (value: string) => {
    await sendMetadata(browser, {
      labels: [{ name: LabelName.TAG, value }],
    });
  },

  historyId: async (historyId: string) => {
    await sendMetadata(browser, {
      historyId,
    });
  },

  testCaseId: async (testCaseId: string) => {
    await sendMetadata(browser, {
      testCaseId,
    });
  },

  displayName: async (displayName: string) => {
    await sendMetadata(browser, {
      displayName,
    });
  },

  step: async (name: string, body: StepBodyFunction) => {
    const step = new AllureCommandStepExecutable(name);

    await step.run(body, async (message: MetadataMessage) => await sendMetadata(browser, message));
  },
});
