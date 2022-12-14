import { Label, LabelName } from "allure-js-commons";
import { EventList } from "postman-collection";

export const extractMeta = (eventList: EventList) => {
  const labels: Label[] = [];

  const allureIdRegexp = /\/\/\s+@allure:id=(.+)/;
  const allureLabelRegexp = /\/\/\s+@allure-label:(.+)=(.+)/;

  eventList.each((event) => {
    if (event.listen === "test" && event.script.exec) {
      event.script.exec.forEach((line) => {
        const id = line.match(allureIdRegexp);
        if (id) {
          labels.push({ name: LabelName.AS_ID, value: id[1] });
        }
        const label = line.match(allureLabelRegexp);
        if (label) {
          labels.push({ name: label[1], value: label[2] });
        }
      });
    }
  });

  return { labels };
};
