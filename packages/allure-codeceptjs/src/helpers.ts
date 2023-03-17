import {
  allureIdRegexp,
  allureIssueRegexp,
  allureLabelRegexp,
  allureTMSRegexp,
  Label,
  LabelName,
  Link,
  LinkType,
} from "allure-js-commons";
import { CodeceptTest } from "./codecept-types";

export const extractMeta = (test: CodeceptTest & { tags: string[] }) => {
  const labels: Label[] = [];
  const links: Link[] = [];
  test.tags.forEach((tag) => {
    const idMatch = tag.match(allureIdRegexp);
    const idValue = idMatch?.groups?.id;
    if (idValue) {
      labels.push({ name: LabelName.ALLURE_ID, value: idValue });
      return;
    }

    const issueMatch = tag.match(allureIssueRegexp);
    const issueName = issueMatch?.groups?.name;
    if (issueName) {
      links.push({ url: "", type: LinkType.ISSUE, name: issueName });
      return;
    }

    const tmsMatch = tag.match(allureTMSRegexp);
    const tmsName = tmsMatch?.groups?.name;
    if (tmsName) {
      links.push({ url: "", type: LinkType.TMS, name: tmsName });
      return;
    }

    const labelMatch = tag.match(allureLabelRegexp);
    const { name: tagName, value: tagValue } = labelMatch?.groups || {};
    if (tagName && tagValue) {
      labels.push({ name: tagName, value: tagValue });
      return;
    }

    labels.push({ name: LabelName.TAG, value: tag });
  });

  return { labels, links };
};
