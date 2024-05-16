import { EventList } from "postman-collection";
import { Label, LabelName, allureIdRegexp, allureLabelRegexp } from "allure-js-commons/sdk/node";

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

        const idMatch = trimmedCommentValue.match(allureIdRegexp as RegExp);
        const idValue = idMatch?.groups?.id;
        if (idValue) {
          labels.push({ name: LabelName.ALLURE_ID, value: idValue });
        }

        const labelMatch = trimmedCommentValue.match(allureLabelRegexp as RegExp);
        const { name, value } = labelMatch?.groups || {};

        if (name && value) {
          labels.push({ name, value });
        }
      });
    }
  });

  return { labels };
};
