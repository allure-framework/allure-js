import { MetadataMessage, ParameterOptions } from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";

export const getSuitePath = (test: Hermione.Test): string[] => {
  const path = [];
  let currentSuite = test.parent as Hermione.Suite;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent as Hermione.Suite;
  }

  return path;
};
export const sendMetadata = async (testId: string, metadata: MetadataMessage) =>
  new Promise((resolve, reject) => {
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

        return resolve(true);
      },
    );
  });

export const addLabel = async (testId: string, name: string, value: string) => {
  await sendMetadata(testId, {
    info: {
      labels: [{ name, value }],
    },
  });
};

export const addLink = async (testId: string, url: string, name?: string, type?: string) => {
  await sendMetadata(testId, {
    info: {
      links: [{ name, url, type }],
    },
  });
};

export const addParameter = async (
  testId: string,
  name: string,
  value: string,
  options?: ParameterOptions,
) => {
  await sendMetadata(testId, {
    info: {
      parameter: [{ name, value, ...options }],
    },
  });
};

export const addAttachment = async (testId: string, content: string | Buffer, type: string) => {
  const isBuffer = Buffer.isBuffer(content);

  await sendMetadata(testId, {
    info: {
      attachments: [
        {
          name: "Attachment",
          content: isBuffer ? content.toString("base64") : content,
          encoding: isBuffer ? "base64" : "utf8",
          type,
        },
      ],
    },
  });
};
