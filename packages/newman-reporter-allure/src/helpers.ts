import { allureIdRegexp, allureLabelRegexp, Label, LabelName } from "allure-js-commons";
import { EventList } from "postman-collection";

export const extractMeta = (eventList: EventList) => {
  const labels: Label[] = [];

  eventList.each((event) => {
    if (event.listen === "test" && event.script.exec) {
      event.script.exec.forEach((line) => {
        const isCommentLine = line.trim().startsWith("//");
        if (!isCommentLine) {
          return;
        }
        const trimmedCommentValue = line.trim().replace("//", "").trim();

        const idMatch = trimmedCommentValue.match(allureIdRegexp);
        const idValue = idMatch?.groups?.id;
        if (idValue) {
          labels.push({ name: LabelName.ALLURE_ID, value: idValue });
        }

        const labelMatch = trimmedCommentValue.match(allureLabelRegexp);
        const { name, value } = labelMatch?.groups || {};

        if (name && value) {
          labels.push({ name, value });
        }
      });
    }
  });

  return { labels };
};
