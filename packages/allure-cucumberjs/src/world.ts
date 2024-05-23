import { World } from "@cucumber/cucumber";
import {
  allureId,
  attachment,
  description,
  descriptionHtml,
  displayName,
  epic,
  feature,
  historyId,
  issue,
  label,
  labels,
  layer,
  link,
  links,
  owner,
  parameter,
  parentSuite,
  severity,
  step,
  story,
  subSuite,
  suite,
  tag,
  tags,
  testCaseId,
  tms,
} from "allure-js-commons";

class AllureCucumberWorld extends World {
  allureId = allureId;
  attachment = attachment;
  description = description;
  descriptionHtml = descriptionHtml;
  displayName = displayName;
  epic = epic;
  feature = feature;
  historyId = historyId;
  issue = issue;
  label = label;
  labels = labels;
  layer = layer;
  link = link;
  links = links;
  owner = owner;
  parameter = parameter;
  parentSuite = parentSuite;
  severity = severity;
  step = step;
  story = story;
  subSuite = subSuite;
  suite = suite;
  tag = tag;
  tags = tags;
  testCaseId = testCaseId;
  tms = tms;
}

export { AllureCucumberWorld };
