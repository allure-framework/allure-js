import {
  allureId,
  epic,
  feature,
  issue,
  layer,
  owner,
  parentSuite,
  severity,
  story,
  subSuite,
  suite,
  tag,
  tms,
} from "allure-js-commons";
import { MessageTestRuntime, RuntimeMessage } from "allure-js-commons/sdk/node";
import { AllureCodeceptJsReporter } from "./reporter.js";

export class AllureCodeceptJsTestRuntime extends MessageTestRuntime {
  constructor(private readonly reporter: AllureCodeceptJsReporter) {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.reporter.handleRuntimeMessage(message);
    await Promise.resolve();
  }

  issue = issue;
  tms = tms;
  allureId = allureId;
  epic = epic;
  feature = feature;
  layer = layer;
  owner = owner;
  parentSuite = parentSuite;
  subSuite = subSuite;
  suite = suite;
  severity = severity;
  story = story;
  tag = tag;
}
