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

/**
 * @deprecated please use api exported by "allure-js-commons" instead.
 */
class LegacyAllureApi {
  /**
   * @deprecated please use import { epic } from "allure-js-commons" instead.
   */
  epic = (epic: string) => Promise.resolve(commons.epic(epic));
  /**
   * @deprecated please use import { feature } from "allure-js-commons" instead.
   */
  feature = (feature: string) => Promise.resolve(commons.feature(feature));
  /**
   * @deprecated please use import { story } from "allure-js-commons" instead.
   */
  story = (story: string) => Promise.resolve(commons.story(story));
  /**
   * @deprecated please use import { suite } from "allure-js-commons" instead.
   */
  suite = (name: string) => Promise.resolve(commons.suite(name));
  /**
   * @deprecated please use import { parentSuite } from "allure-js-commons" instead.
   */
  parentSuite = (name: string) => Promise.resolve(commons.parentSuite(name));
  /**
   * @deprecated please use import { subSuite } from "allure-js-commons" instead.
   */
  subSuite = (name: string) => Promise.resolve(commons.subSuite(name));
  /**
   * @deprecated please use import { label } from "allure-js-commons" instead.
   */
  label = (name: string, value: string) => Promise.resolve(commons.label(name, value));
  /**
   * @deprecated please use import { parameter } from "allure-js-commons" instead.
   */
  parameter = (name: string, value: any, options?: ParameterOptions) =>
    Promise.resolve(commons.parameter(name, serialize(value), options));
  /**
   * @deprecated please use import { link } from "allure-js-commons" instead.
   */
  link = (url: string, name?: string, type?: string) => Promise.resolve(commons.link(url, name, type));
  /**
   * @deprecated please use import { issue } from "allure-js-commons" instead.
   */
  issue = (name: string, url: string) => Promise.resolve(commons.issue(url, name));
  /**
   * @deprecated please use import { tms } from "allure-js-commons" instead.
   */
  tms = (name: string, url: string) => Promise.resolve(commons.tms(url, name));
  /**
   * @deprecated please use import { description } from "allure-js-commons" instead.
   */
  description = (markdown: string) => Promise.resolve(commons.description(markdown));
  /**
   * @deprecated please use import { descriptionHtml } from "allure-js-commons" instead.
   */
  descriptionHtml = (html: string) => Promise.resolve(commons.descriptionHtml(html));
  /**
   * @deprecated please use import { owner } from "allure-js-commons" instead.
   */
  owner = (owner: string) => Promise.resolve(commons.owner(owner));
  /**
   * @deprecated please use import { severity } from "allure-js-commons" instead.
   */
  severity = (severity: string) => Promise.resolve(commons.severity(severity));
  /**
   * @deprecated please use import { layer } from "allure-js-commons" instead.
   */
  layer = (layer: string) => Promise.resolve(commons.layer(layer));
  /**
   * @deprecated please use import { allureId } from "allure-js-commons" instead.
   */
  id = (allureId: string) => Promise.resolve(commons.allureId(allureId));
  /**
   * @deprecated please use import { tag } from "allure-js-commons" instead.
   */
  tag = (tag: string) => Promise.resolve(commons.tag(tag));
  /**
   * @deprecated please use the `environmentInfo` config option instead.
   */
  writeEnvironmentInfo = (info: Record<string, string>) => {
    getLegacyApiRuntime()?.writer.writeEnvironmentInfo(info);
  };
  /**
   * @deprecated please use the `categories` config option instead.
   */
  writeCategoriesDefinitions = (categories: Category[]) => {
    getLegacyApiRuntime()?.writer.writeCategoriesDefinitions(categories);
  };
  /**
   * @deprecated please use import { attachment } from "allure-js-commons" instead.
   */
  attachment = (name: string, content: Buffer | string, options: ContentType | string | AttachmentOptions) =>
    Promise.resolve(
      commons.attachment(name, content, typeof options === "string" ? { contentType: options } : options),
    );
  /**
   * @deprecated please use import { attachment } from "allure-js-commons" instead.
   */
  testAttachment = (name: string, content: Buffer | string, options: ContentType | string | AttachmentOptions) => {
    const runtime = getLegacyApiRuntime();
    const currentTest = runtime?.getCurrentTest();
    if (currentTest) {
      const opts: AttachmentOptions = typeof options === "string" ? { contentType: options } : { ...options };
      runtime?.writeAttachment(
        name,
        Buffer.from(content),
        {
          ...opts,
        },
        currentTest.uuid,
      );
    }
  };
  /**
   * @deprecated please use import { step } from "allure-js-commons" instead.
   */
  logStep = (name: string, status?: Status) => {
    this.step(name, () => {
      getLegacyApiRuntime()?.updateStep((s) => (s.status = status));
    });
  };

  // It's sync-first. That's why we can't simply reuse commons.step.
  /**
   * @deprecated please use import { step } from "allure-js-commons" instead.
   */
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
