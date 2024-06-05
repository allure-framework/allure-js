import type { EventList } from "postman-collection";
import type { Label } from "allure-js-commons";
import { extractMetadataFromString } from "allure-js-commons/sdk";

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
        const metadata = extractMetadataFromString(trimmedCommentValue);
        labels.push(...(metadata.labels));
      });
    }
  });

  return { labels };
};
