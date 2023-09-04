import {
  allureIdRegexp,
  allureIdRegexpGlobal,
  allureLabelRegexp,
  allureLabelRegexpGlobal,
  Label,
  LabelName,
} from "allure-js-commons";

export const extractMetadataFromString = (
  title: string,
): { labels: Label[]; cleanTitle: string } => {
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

  const cleanTitle = title
    .replace(allureLabelRegexpGlobal, "")
    .replace(allureIdRegexpGlobal, "")
    .trim();

  return { labels, cleanTitle };
};
