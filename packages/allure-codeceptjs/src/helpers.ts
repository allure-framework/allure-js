import type { Label } from "allure-js-commons";
import { LabelName } from "allure-js-commons";
import type { CodeceptTest } from "./model.js";

const allureIdRegexp = /@?allure.id[:=](?<id>[^\s]+)/;
const allureLabelRegexp = /@?allure.label.(?<name>[^\s]+?)[:=](?<value>[^\s]+)/;

export const extractMeta = (test: CodeceptTest & { tags: string[] }) => {
  const labels: Label[] = test.tags.map((tag) => {
    const idMatch = tag.match(allureIdRegexp);
    const idValue = idMatch?.groups?.id;

    if (idValue) {
      return { name: LabelName.ALLURE_ID, value: idValue };
    }

    const labelMatch = tag.match(allureLabelRegexp);
    const { name, value } = labelMatch?.groups || {};

    if (name && value) {
      return { name, value };
    }

    return { name: LabelName.TAG, value: tag.startsWith("@") ? tag.substring(1) : tag };
  });

  return { labels };
};
