import {
  ContentType,
  Label,
  LabelName,
  Link,
  LinkType,
  ParameterMode,
  ParameterOptions,
  RuntimeMessage,
  Stage,
  Status,
} from "./model.js";
import { getStatusFromError, requireModule } from "./utils.js";

export const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";

export interface TestRuntime {
  labels: (...labels: Label[]) => PromiseLike<void>;

  links: (...links: Link[]) => PromiseLike<void>;

  parameter: (name: string, value: string, options?: ParameterOptions) => PromiseLike<void>;

  description: (markdown: string) => PromiseLike<void>;

  descriptionHtml: (html: string) => PromiseLike<void>;

  displayName: (name: string) => PromiseLike<void>;

  historyId: (value: string) => PromiseLike<void>;

  testCaseId: (value: string) => PromiseLike<void>;

  attachment: (name: string, content: Buffer | string, type: ContentType | string) => PromiseLike<void>;

  step: <T = void>(name: string, body: () => T | PromiseLike<T>) => PromiseLike<T>;

  stepDisplayName: (name: string) => PromiseLike<void>;

  stepParameter: (name: string, value: string, mode?: ParameterMode) => PromiseLike<void>;
}

class NoopRuntime implements TestRuntime {
  async attachment() {
    await this.warning();
  }

  async description() {
    await this.warning();
  }

  async descriptionHtml() {
    await this.warning();
  }

  async displayName() {
    await this.warning();
  }

  async historyId() {
    await this.warning();
  }

  async labels() {
    await this.warning();
  }

  async links() {
    await this.warning();
  }

  async parameter() {
    await this.warning();
  }

  async step<T>(name: string, body: () => T | PromiseLike<T>): Promise<T> {
    await this.warning();
    return body();
  }

  async stepDisplayName() {
    await this.warning();
  }

  async stepParameter() {
    await this.warning();
  }

  async testCaseId() {
    await this.warning();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async warning() {
    // eslint-disable-next-line no-console
    console.log("no test runtime is found. Please check test framework configuration");
  }
}

const noopRuntime = new NoopRuntime();

export abstract class MessageTestRuntime implements TestRuntime {
  async label(name: LabelName | string, value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels: [{ name, value }],
      },
    });
  }

  async labels(...labels: Label[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  async link(url: string, type?: LinkType | string, name?: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links: [{ type, url, name }],
      },
    });
  }

  async links(...links: Link[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  async parameter(name: string, value: string, options?: ParameterOptions) {
    await this.sendMessage({
      type: "metadata",
      data: {
        parameters: [
          {
            name,
            value,
            ...options,
          },
        ],
      },
    });
  }

  async description(markdown: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  async descriptionHtml(html: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  async displayName(name: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  async historyId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  async testCaseId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  async attachment(name: string, content: Buffer | string, type: string | ContentType) {
    await this.sendMessage({
      type: "raw_attachment",
      data: {
        name,
        content: Buffer.from(content).toString("base64"),
        contentType: type,
        encoding: "base64",
      },
    });
  }

  async step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    await this.sendMessage({
      type: "step_start",
      data: {
        name,
        start: Date.now(),
      },
    });

    try {
      const result = await body();

      await this.sendMessage({
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });

      return result;
    } catch (err) {
      const { message, stack } = err as Error;

      await this.sendMessage({
        type: "step_stop",
        data: {
          status: getStatusFromError(err as Error),
          stage: Stage.FINISHED,
          stop: Date.now(),
          statusDetails: {
            message,
            trace: stack,
          },
        },
      });

      throw err;
    }
  }

  async stepDisplayName(name: string) {
    await this.sendMessage({
      type: "step_metadata",
      data: { name },
    });
  }

  async stepParameter(name: string, value: string, mode?: ParameterMode) {
    await this.sendMessage({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  abstract sendMessage(message: RuntimeMessage): Promise<void>;
}

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any)[ALLURE_TEST_RUNTIME_KEY] = () => runtime;
};

const getGlobalTestRuntimeFunction = () => {
  return (globalThis as any)?.[ALLURE_TEST_RUNTIME_KEY] as (() => TestRuntime | undefined) | undefined;
};

export const getGlobalTestRuntime = async (): Promise<TestRuntime> => {
  const testRuntime = getGlobalTestRuntimeFunction();

  if (testRuntime) {
    return testRuntime() ?? noopRuntime;
  }

  if ("_playwrightInstance" in globalThis) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      await requireModule("allure-playwright/autoconfig");

      return getGlobalTestRuntimeFunction()?.() ?? noopRuntime;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("can't execute allure-playwright/autoconfig", err);
      return noopRuntime;
    }
  }

  if ("__vitest_environment__" in globalThis) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      await import("allure-vitest/autoconfig");

      return getGlobalTestRuntimeFunction()?.() ?? noopRuntime;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("can't execute allure-vitest/autoconfig", err);
      return noopRuntime;
    }
  }

  return noopRuntime;
};
