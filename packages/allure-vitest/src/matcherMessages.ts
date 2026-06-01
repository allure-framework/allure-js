import type { RuntimeMessage } from "allure-js-commons/sdk";

export const ALLURE_VITEST_MATCHER_MESSAGE_KEY = "__allureVitestMatcher";

export type AllureVitestMatcherRuntimeMessage = RuntimeMessage & {
  [ALLURE_VITEST_MATCHER_MESSAGE_KEY]?: true;
};

export const markAsMatcherMessage = <T extends RuntimeMessage>(message: T): T & AllureVitestMatcherRuntimeMessage =>
  ({
    ...message,
    [ALLURE_VITEST_MATCHER_MESSAGE_KEY]: true,
  }) as T & AllureVitestMatcherRuntimeMessage;

export const isMatcherMessage = (message: RuntimeMessage) =>
  Boolean((message as AllureVitestMatcherRuntimeMessage)[ALLURE_VITEST_MATCHER_MESSAGE_KEY]);
