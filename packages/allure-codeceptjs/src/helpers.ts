import { Label, LabelName, allureIdRegexp, allureLabelRegexp } from "allure-js-commons";
import { CodeceptTest } from "./codecept-types";

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

    return { name: LabelName.TAG, value: tag };
  });

  return { labels };
};
