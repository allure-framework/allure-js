import * as commons from "allure-js-commons";
import type { Category, ContentType, ParameterOptions, Status } from "allure-js-commons";
import type { ReporterRuntime } from "allure-js-commons/sdk";

interface StepInterface {
  parameter(name: string, value: string): void;
  name(name: string): void;
}

interface AttachmentOptions {
  contentType: ContentType | string;
  fileExtension?: string;
}

class LegacyAllureApi {
  runtime: ReporterRuntime | undefined;

  epic = (epic: string) => {
    commons.epic(epic);
  };
  feature = (feature: string) => {
    commons.feature(feature);
  };
  story = (story: string) => {
    commons.story(story);
  };
  suite = (name: string) => {
    commons.suite(name);
  };
  parentSuite = (name: string) => {
    commons.parentSuite(name);
  };
  subSuite = (name: string) => {
    commons.subSuite(name);
  };
  label = (name: string, value: string) => {
    commons.label(name, value);
  };
  parameter = (name: string, value: any, options?: ParameterOptions) => {
    commons.parameter(name, commons.serialize(value), options);
  };
  link = (url: string, name?: string, type?: string) => {
    commons.link(url, type, name);
  };
  issue = (name: string, url: string) => {
    commons.issue(url, name);
  };
  tms = (name: string, url: string) => {
    commons.tms(url, name);
  };
  description = (markdown: string) => {
    commons.description(markdown);
  };
  descriptionHtml = (html: string) => {
    commons.descriptionHtml(html);
  };
  owner = (owner: string) => {
    commons.owner(owner);
  };
  severity = (severity: string) => {
    commons.severity(severity);
  };
  layer = (layer: string) => {
    commons.layer(layer);
  };
  id = (allureId: string) => {
    commons.allureId(allureId);
  };
  tag = (tag: string) => {
    commons.tag(tag);
  };
  writeEnvironmentInfo = (info: Record<string, string>) => {
    this.runtime?.writer.writeEnvironmentInfo(info);
  };
  writeCategoriesDefinitions = (categories: Category[]) => {
    this.runtime?.writer.writeCategoriesDefinitions(categories);
  };
  attachment = (name: string, content: Buffer | string, options: ContentType | string | AttachmentOptions) => {
    commons.attachment(name, content, typeof options === "string" ? options : options.contentType);
  };
  testAttachment = (name: string, content: Buffer | string, options: ContentType | string | AttachmentOptions) => {
    const currentTestUuid = this.runtime?.getCurrentTest()?.uuid;
    if (currentTestUuid) {
      // TODO: handle options.fileExtension
      this.runtime?.applyRuntimeMessages(
        [
          {
            type: "raw_attachment",
            data: {
              name,
              content: Buffer.from(content).toString("base64"),
              contentType: typeof options === "string" ? options : options.contentType,
              encoding: "base64",
            },
          },
        ],
        { testUuid: currentTestUuid },
      );
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logStep = (name: string, status?: Status) => {
    commons.step(name, () => {}); // Allure Mocha 2.15.1 doesn't handle statuses too
  };
  step = <T>(name: string, body: (step: StepInterface) => T): T => {
    let result: T;
    commons.step<T>(
      name,
      (ctx) =>
        (result = body({
          name: (n) => ctx.displayName(n),
          parameter: (n, v) => ctx.parameter(n, v),
        })),
    );
    return result!;
  };
}

export const allure = new LegacyAllureApi();
