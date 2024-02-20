import { basename } from "path";
import { cwd } from "process";
import { Test, Suite } from "hermione";
import { MetadataMessage, ParameterOptions } from "allure-js-commons";
import { ALLURE_METADATA_CONTENT_TYPE } from "allure-js-commons/internal";

export const testIt = () => {
  const get = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
    // const Browser = require("@wdio/globals");
    // return Browser.prototype.executionContext?.ctx;
    return undefined;
  };
  return get();
};

export const getFileSrcPath = (filePath: string): string => {
  const baseDir = basename(cwd());

  return filePath.replace(cwd(), baseDir);
};

export const getSuitePath = (test: Test): string[] => {
  const path = [];
  let currentSuite = test.parent as Suite;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent as Suite;
  }

  return path;
};

export const sendMetadata = async (browserId: string, metadata: MetadataMessage): Promise<void> =>
  new Promise((resolve, reject) => {
    process.send?.(
      {
        type: ALLURE_METADATA_CONTENT_TYPE,
        testId: browserId,
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

export const setDisplayName = async (browserId: string, displayName: string) => {
  await sendMetadata(browserId, {
    displayName,
  });
};

export const setDescription = async (browserId: string, description: string) => {
  await sendMetadata(browserId, {
    description,
  });
};

export const setDescriptionHtml = async (browserId: string, descriptionHtml: string) => {
  await sendMetadata(browserId, {
    descriptionHtml,
  });
};

export const setTestCaseId = async (browserId: string, testCaseId: string) => {
  await sendMetadata(browserId, {
    testCaseId,
  });
};

export const setHistoryId = async (browserId: string, historyId: string) => {
  await sendMetadata(browserId, {
    historyId,
  });
};

export const addLabel = async (browserId: string, name: string, value: string) => {
  await sendMetadata(browserId, {
    labels: [{ name, value }],
  });
};

export const addLink = async (browserId: string, url: string, name?: string, type?: string) => {
  await sendMetadata(browserId, {
    links: [{ name, url, type }],
  });
};

export const addParameter = async (browserId: string, name: string, value: any, options?: ParameterOptions) => {
  await sendMetadata(browserId, {
    parameter: [{ name, value, ...options }],
  });
};

export const addAttachment = async (browserId: string, content: string | Buffer, type: string) => {
  const isBuffer = Buffer.isBuffer(content);

  await sendMetadata(browserId, {
    attachments: [
      {
        name: "Attachment",
        content: isBuffer ? content.toString("base64") : content,
        encoding: isBuffer ? "base64" : "utf8",
        type,
      },
    ],
  });
};
