import { allureIdRegexp, allureLabelRegexp, Label, LabelName } from "allure-js-commons";

export const extractMetadataFromString = (title: string): { labels: Label[] } => {
  const labels = [] as Label[];
  title.split(" ").forEach((val) => {
    const idValue = val.match(allureIdRegexp)?.groups?.id;
    if (idValue) {
      labels.push({ name: LabelName.ALLURE_ID, value: idValue });
    }

    const labelMatch = val.match(allureLabelRegexp);
    const { name, value } = labelMatch?.groups || {};
    if (name && value) {
      labels?.push({ name, value });
    }
  });

  return { labels };
};
