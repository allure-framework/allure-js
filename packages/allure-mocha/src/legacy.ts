import * as commons from "allure-js-commons";
import type { ContentType, ParameterOptions } from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import type { Category } from "allure-js-commons/sdk";
import { getStatusFromError, isPromise } from "allure-js-commons/sdk";
import { serialize } from "allure-js-commons/sdk/reporter";
import { getLegacyApiRuntime } from "./legacyUtils.js";

interface StepInterface {
  parameter(name: string, value: string): void;

  name(name: string): void;
}

interface AttachmentOptions {
  contentType: ContentType | string;
  fileExtension?: string;
}

class LegacyAllureApi {
  epic = (epic: string) => Promise.resolve(commons.epic(epic));
  feature = (feature: string) => Promise.resolve(commons.feature(feature));
  story = (story: string) => Promise.resolve(commons.story(story));
  suite = (name: string) => Promise.resolve(commons.suite(name));
  parentSuite = (name: string) => Promise.resolve(commons.parentSuite(name));
  subSuite = (name: string) => Promise.resolve(commons.subSuite(name));
  label = (name: string, value: string) => Promise.resolve(commons.label(name, value));
  parameter = (name: string, value: any, options?: ParameterOptions) =>
    Promise.resolve(commons.parameter(name, serialize(value) as string, options));
  link = (url: string, name?: string, type?: string) => Promise.resolve(commons.link(url, name, type));
  issue = (name: string, url: string) => Promise.resolve(commons.issue(url, name));
  tms = (name: string, url: string) => Promise.resolve(commons.tms(url, name));
  description = (markdown: string) => Promise.resolve(commons.description(markdown));
  descriptionHtml = (html: string) => Promise.resolve(commons.descriptionHtml(html));
  owner = (owner: string) => Promise.resolve(commons.owner(owner));
  severity = (severity: string) => Promise.resolve(commons.severity(severity));
  layer = (layer: string) => Promise.resolve(commons.layer(layer));
  id = (allureId: string) => Promise.resolve(commons.allureId(allureId));
  tag = (tag: string) => Promise.resolve(commons.tag(tag));
  writeEnvironmentInfo = (info: Record<string, string>) => {
    getLegacyApiRuntime()?.writer.writeEnvironmentInfo(info);
  };
  writeCategoriesDefinitions = (categories: Category[]) => {
    getLegacyApiRuntime()?.writer.writeCategoriesDefinitions(categories);
  };
  attachment = (name: string, content: Buffer | string, options: ContentType | string | AttachmentOptions) =>
    Promise.resolve(commons.attachment(name, content, typeof options === "string" ? options : options.contentType));
  testAttachment = (name: string, content: Buffer | string, options: ContentType | string | AttachmentOptions) => {
    const runtime = getLegacyApiRuntime();
    const currentTest = runtime?.getCurrentTest();
    if (currentTest) {
      runtime?.writeAttachmentForItem(
        {
          name,
          content: Buffer.from(content).toString("base64"),
          contentType: typeof options === "string" ? options : options.contentType,
          encoding: "base64",
          fileExtension: typeof options === "string" ? undefined : options.fileExtension,
        },
        currentTest,
      );
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  logStep = (name: string, status?: Status) => {
    this.step(name, () => {
      getLegacyApiRuntime()?.updateStep((s) => (s.status = status));
    });
  };
  // It's sync-first. That's why we can't simply reuse commons.step.
  step = <T>(name: string, body: (step: StepInterface) => T): T => {
    const runtime = getLegacyApiRuntime();
    runtime?.applyRuntimeMessages([
      {
        type: "step_start",
        data: {
          name,
          start: Date.now(),
        },
      },
    ]);
    try {
      const result = body({
        name: this.renameStep,
        parameter: this.addStepParameter,
      });
      if (isPromise(result)) {
        const promise = result as Promise<any>;
        return promise
          .then((v) => {
            this.stopStepSuccess();
            return v;
          })
          .catch((e) => {
            this.stopStepWithError(e);
            throw e;
          }) as T;
      }
      this.stopStepSuccess();
      return result;
    } catch (e) {
      this.stopStepWithError(e);
      throw e;
    }
  };

  private renameStep = (name: string) => {
    getLegacyApiRuntime()?.applyRuntimeMessages([
      {
        type: "step_metadata",
        data: { name },
      },
    ]);
  };

  private addStepParameter = (name: string, value: string) => {
    getLegacyApiRuntime()?.applyRuntimeMessages([
      {
        type: "step_metadata",
        data: {
          parameters: [{ name, value }],
        },
      },
    ]);
  };

  private stopStepSuccess = () => {
    getLegacyApiRuntime()?.applyRuntimeMessages([
      {
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      },
    ]);
  };

  private stopStepWithError = (error: unknown) => {
    const { message, stack } = error as Error;
    getLegacyApiRuntime()?.applyRuntimeMessages([
      {
        type: "step_stop",
        data: {
          status: getStatusFromError(error as Error),
          stage: Stage.FINISHED,
          stop: Date.now(),
          statusDetails: {
            message,
            trace: stack,
          },
        },
      },
    ]);
  };
}

export const allure = new LegacyAllureApi();
