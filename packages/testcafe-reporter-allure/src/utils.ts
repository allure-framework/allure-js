import { existsSync } from "node:fs";
import path from "node:path";

import { ContentType, LabelName, LinkType, Status, type Label, type Link, type Parameter } from "allure-js-commons";
import { extractMetadataFromString, getStatusFromError, stripAnsi, type RuntimeMessage } from "allure-js-commons/sdk";
import {
  formatLink,
  getPosixPath,
  getRelativePath,
  parseTestPlan,
  type LinkConfig,
} from "allure-js-commons/sdk/reporter";

import type {
  AllureTestCafeRuntimeEnvelope,
  FixtureState,
  ReporterStatusResult,
  RuntimeMessagesByTestRun,
  StartedTestState,
  TestCafeBrowserInfo,
  TestCafeErrorLike,
  TestCafeFormattedCommand,
  TestCafeFormattedSelector,
  TestCafeReporterActionInfo,
  TestCafeScreenshotInfo,
  TestCafeTestRunInfo,
  TestCafeVideoInfo,
} from "./model.js";

const ALLURE_LINK_PREFIX = "allure.link.";
const ALLURE_LABEL_PREFIX = "allure.label.";
const ACTION_STRING_LIMIT = 120;
const ACTION_OBJECT_KEYS_LIMIT = 5;
const ACTION_ARRAY_ITEMS_LIMIT = 5;
const ACTION_SERIALIZATION_DEPTH_LIMIT = 3;

const resolveNearestPackageRoot = (filepath: string) => {
  let currentDir = path.dirname(path.resolve(filepath));

  while (true) {
    if (existsSync(path.join(currentDir, "package.json"))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return undefined;
    }

    currentDir = parentDir;
  }
};

export const getFixtureRelativePath = (fixturePath: string) => {
  if (!path.isAbsolute(fixturePath)) {
    return getPosixPath(fixturePath);
  }

  const packageRoot = resolveNearestPackageRoot(fixturePath);
  const relativePath = packageRoot ? path.relative(packageRoot, fixturePath) : getRelativePath(fixturePath);

  return getPosixPath(relativePath);
};

export const getPackageLabelValueFromRelativePath = (relativePath: string) =>
  relativePath
    .split("/")
    .filter((segment) => segment)
    .join(".");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asErrorLike = (value: unknown): Partial<Error> => {
  if (value instanceof Error) {
    return value;
  }

  if (!isPlainObject(value)) {
    return {};
  }

  const originError = (value as TestCafeErrorLike).originError;

  if (originError instanceof Error || isPlainObject(originError)) {
    return originError as Partial<Error>;
  }

  return value as Partial<Error>;
};

const getTestCafeErrorLike = (value: unknown): TestCafeErrorLike =>
  isPlainObject(value) || value instanceof Error ? (value as TestCafeErrorLike) : {};

const isScalar = (value: unknown): value is string | number | boolean | bigint =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint";

const toScalarStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter(isScalar).map((item) => `${item}`);
  }

  if (isScalar(value)) {
    return [`${value}`];
  }

  return [];
};

const truncateText = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 3))}...`;

const formatActionText = (value: string, maxLength = ACTION_STRING_LIMIT) => truncateText(stripAnsi(value), maxLength);

const formatErrorFallbackText = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    return stripAnsi(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return `${value}`;
  }

  return stripAnsi(formatActionValue(value));
};

const formatSelectorExpression = (selector: TestCafeFormattedSelector | undefined) => {
  if (selector?.expression) {
    const expression = formatActionText(selector.expression);
    const directSelectorMatch = expression.match(/^Selector\((['"`])([\s\S]*)\1\)$/);

    if (directSelectorMatch) {
      return formatActionText(directSelectorMatch[2]);
    }

    return expression;
  }

  return undefined;
};

const isAssertionLikeError = (error: unknown) => {
  if (!isPlainObject(error)) {
    return false;
  }

  if (error.code === "E53") {
    return true;
  }

  if (error.actual !== undefined && error.expected !== undefined) {
    return true;
  }

  return typeof error.message === "string" && error.message.startsWith("AssertionError");
};

const formatActionValue = (value: unknown, depth = 0): string => {
  if (value === undefined) {
    return "undefined";
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(formatActionText(value));
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return `${value}`;
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, ACTION_ARRAY_ITEMS_LIMIT).map((item) => formatActionValue(item, depth + 1));
    const suffix = value.length > ACTION_ARRAY_ITEMS_LIMIT ? ", ..." : "";
    return `[${items.join(", ")}${suffix}]`;
  }

  if (isPlainObject(value)) {
    if (typeof value.expression === "string") {
      return formatActionText(value.expression);
    }

    if (depth >= ACTION_SERIALIZATION_DEPTH_LIMIT) {
      return "{...}";
    }

    const definedEntries = Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined);
    const serializedEntries = definedEntries
      .slice(0, ACTION_OBJECT_KEYS_LIMIT)
      .map(([key, nestedValue]) => `${key}: ${formatActionValue(nestedValue, depth + 1)}`);
    const suffix = definedEntries.length > ACTION_OBJECT_KEYS_LIMIT ? ", ..." : "";

    return `{ ${serializedEntries.join(", ")}${suffix} }`;
  }

  return Object.prototype.toString.call(value);
};

const sanitizeActionValue = (value: unknown, depth = 0): unknown => {
  if (value === undefined || value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return `${value}`;
  }

  if (typeof value === "string") {
    return formatActionText(value);
  }

  if (Array.isArray(value)) {
    const sanitizedItems = value.slice(0, ACTION_ARRAY_ITEMS_LIMIT).map((item) => sanitizeActionValue(item, depth + 1));

    if (value.length > ACTION_ARRAY_ITEMS_LIMIT) {
      sanitizedItems.push("...");
    }

    return sanitizedItems;
  }

  if (isPlainObject(value)) {
    if (depth >= ACTION_SERIALIZATION_DEPTH_LIMIT) {
      return "[Object]";
    }

    const definedEntries = Object.entries(value).filter(([, nestedValue]) => nestedValue !== undefined);
    const sanitizedRecord = definedEntries
      .slice(0, ACTION_OBJECT_KEYS_LIMIT)
      .reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
        acc[key] = sanitizeActionValue(nestedValue, depth + 1);
        return acc;
      }, {});

    if (definedEntries.length > ACTION_OBJECT_KEYS_LIMIT) {
      sanitizedRecord["..."] = true;
    }

    return sanitizedRecord;
  }

  return Object.prototype.toString.call(value);
};

const formatActionCall = (name: string, args: Array<string | undefined>) => {
  const filteredArgs = args.filter((arg): arg is string => Boolean(arg));
  return filteredArgs.length === 0 ? `${name}()` : `${name}(${filteredArgs.join(", ")})`;
};

const formatActionRequest = (command: TestCafeFormattedCommand) => {
  const method =
    isPlainObject(command.options) && typeof command.options.method === "string"
      ? command.options.method.toUpperCase()
      : undefined;
  const url =
    typeof command.url === "string"
      ? formatActionText(command.url)
      : isPlainObject(command.options) && typeof command.options.url === "string"
        ? formatActionText(command.options.url)
        : undefined;

  if (!method && !url) {
    return "request()";
  }

  return `request(${[method, url].filter(Boolean).join(" ")})`;
};

const formatAssertionStepName = (apiActionName: string, command: TestCafeFormattedCommand) => {
  const actual = formatActionValue(command.actual);

  switch (apiActionName) {
    case "ok":
    case "notOk":
      return `expect(${actual}).${apiActionName}()`;
    case "within":
    case "notWithin":
      return `expect(${actual}).${apiActionName}(${formatActionValue(command.expected)}, ${formatActionValue(command.expected2)})`;
    default:
      if (command.expected !== undefined) {
        return `expect(${actual}).${apiActionName}(${formatActionValue(command.expected)})`;
      }
      return `expect(${actual}).${apiActionName}()`;
  }
};

export const normalizeMeta = (value: unknown): Record<string, unknown> => (isPlainObject(value) ? value : {});

const setSingleLabelValue = (labels: Label[], labelName: LabelName | string, value: string) => {
  const idx = labels.findIndex((label) => label.name === labelName);
  if (idx !== -1) {
    labels[idx] = { name: labelName, value };
    return;
  }

  labels.push({ name: labelName, value });
};

export const mergeFixtureAndTestMeta = (
  fixtureMeta: Record<string, unknown>,
  testMeta: Record<string, unknown>,
): Record<string, unknown> => ({
  ...fixtureMeta,
  ...testMeta,
});

export const createFixtureState = (
  fixtureName: string,
  fixturePath: string,
  meta: Record<string, unknown>,
): FixtureState => {
  const relativePath = getFixtureRelativePath(fixturePath);

  return {
    name: fixtureName,
    path: fixturePath,
    relativePath,
    meta,
  };
};

export const createTestQueueKey = (fixture: FixtureState, rawName: string) =>
  `${fixture.relativePath}::${fixture.name}::${rawName}`;

export const buildStartedTestState = (
  rawName: string,
  fixture: FixtureState,
  meta: Record<string, unknown>,
  linkConfig?: LinkConfig,
): Omit<StartedTestState, "testUuid" | "testRunId"> & {
  labels: Label[];
  links: Link[];
  parameters: Parameter[];
} => {
  const titleMetadata = extractMetadataFromString(rawName);
  const cleanTitle = titleMetadata.cleanTitle || rawName;
  const titlePath = [fixture.relativePath, fixture.name].filter(Boolean);
  const fullName = [...titlePath, cleanTitle].join("#");
  const labels: Label[] = [...titleMetadata.labels];
  const links = titleMetadata.links.map((link) => (linkConfig ? formatLink(linkConfig, link) : link));
  const parameters: Parameter[] = [];

  for (const [key, value] of Object.entries(meta)) {
    if (key === "allure.id") {
      const [firstId] = toScalarStrings(value);
      if (firstId) {
        setSingleLabelValue(labels, LabelName.ALLURE_ID, firstId);
      }
      continue;
    }

    if (key.startsWith(ALLURE_LABEL_PREFIX)) {
      const labelName = key.slice(ALLURE_LABEL_PREFIX.length);
      toScalarStrings(value).forEach((labelValue) => {
        labels.push({ name: labelName, value: labelValue });
      });
      continue;
    }

    if (key.startsWith(ALLURE_LINK_PREFIX)) {
      const linkType = key.slice(ALLURE_LINK_PREFIX.length) || LinkType.DEFAULT;
      toScalarStrings(value).forEach((linkValue) => {
        const link: Link = {
          type: linkType,
          url: linkValue,
        };

        links.push(linkConfig ? formatLink(linkConfig, link) : link);
      });
      continue;
    }

    if (key.startsWith("allure.")) {
      continue;
    }

    if (isScalar(value)) {
      parameters.push({ name: key, value: `${value}` });
    }
  }

  return {
    rawName,
    cleanTitle,
    fullName,
    titlePath,
    fixture,
    meta,
    labels,
    links,
    parameters,
  };
};

export const getReporterStatusFromErrors = (errors: unknown[]): ReporterStatusResult => {
  const normalizedErrors = errors.filter((error) => error !== undefined && error !== null);
  if (normalizedErrors.length === 0) {
    return {
      status: Status.PASSED,
    };
  }

  const status = normalizedErrors.some(
    (error) => getStatusFromError(asErrorLike(error)) === Status.FAILED || isAssertionLikeError(error),
  )
    ? Status.FAILED
    : Status.BROKEN;

  const formattedErrors = normalizedErrors
    .map((error) => {
      const { message, trace } = getStatusDetailsFromTestCafeError(error);
      return [message, trace].filter(Boolean).join("\n") || formatErrorFallbackText(error);
    })
    .filter(Boolean)
    .join("\n\n");

  return {
    status,
    formattedErrors: formattedErrors || undefined,
  };
};

export const isIgnoredActionStep = (apiActionName: string) =>
  apiActionName === "report" || apiActionName === "takeScreenshotOnFail";

export const formatActionStepName = (apiActionName: string, command: TestCafeFormattedCommand) => {
  if (command.type === "assertion") {
    return formatAssertionStepName(apiActionName, command);
  }

  switch (apiActionName) {
    case "runCustomAction":
      return typeof command.name === "string" && command.name.trim()
        ? formatActionText(command.name)
        : "runCustomAction()";
    case "click":
    case "rightClick":
    case "doubleClick":
    case "hover":
    case "scrollIntoView":
    case "switchToIframe":
    case "clearUpload":
      return formatActionCall(apiActionName, [formatSelectorExpression(command.selector)]);
    case "typeText":
    case "selectText":
    case "selectTextAreaContent":
    case "setFilesToUpload":
      return formatActionCall(apiActionName, [formatSelectorExpression(command.selector)]);
    case "drag":
      return formatActionCall(apiActionName, [formatSelectorExpression(command.selector)]);
    case "dragToElement":
      return formatActionCall(apiActionName, [
        formatSelectorExpression(command.selector),
        formatSelectorExpression(command.destinationSelector),
      ]);
    case "scroll":
      return formatActionCall(apiActionName, [
        formatSelectorExpression(command.selector),
        typeof command.position === "string" ? formatActionText(command.position) : undefined,
        typeof command.x === "number" ? `${command.x}` : undefined,
        typeof command.y === "number" ? `${command.y}` : undefined,
      ]);
    case "scrollBy":
      return formatActionCall(apiActionName, [
        formatSelectorExpression(command.selector),
        typeof command.byX === "number" ? `${command.byX}` : undefined,
        typeof command.byY === "number" ? `${command.byY}` : undefined,
      ]);
    case "pressKey":
      return formatActionCall(apiActionName, [
        typeof command.keys === "string" ? formatActionText(command.keys) : formatActionValue(command.keys),
      ]);
    case "wait":
      return formatActionCall(apiActionName, [typeof command.timeout === "number" ? `${command.timeout}` : undefined]);
    case "navigateTo":
    case "openWindow":
    case "getProxyUrl":
      return formatActionCall(apiActionName, [
        typeof command.url === "string" ? formatActionText(command.url) : formatActionValue(command.url),
      ]);
    case "request":
      return formatActionRequest(command);
    case "takeScreenshot":
      return formatActionCall(apiActionName, [
        typeof command.path === "string" ? formatActionText(command.path) : undefined,
      ]);
    case "takeElementScreenshot":
      return formatActionCall(apiActionName, [
        formatSelectorExpression(command.selector),
        typeof command.path === "string" ? formatActionText(command.path) : undefined,
      ]);
    case "useRole":
      return formatActionCall(apiActionName, [
        isPlainObject(command.role) && typeof command.role.loginUrl === "string"
          ? formatActionText(command.role.loginUrl)
          : undefined,
      ]);
    default: {
      const selectorArgument =
        formatSelectorExpression(command.selector) ??
        formatSelectorExpression(command.startSelector) ??
        formatSelectorExpression(command.endSelector);

      if (selectorArgument) {
        return formatActionCall(apiActionName, [selectorArgument]);
      }

      if (typeof command.url === "string") {
        return formatActionCall(apiActionName, [formatActionText(command.url)]);
      }

      return `${apiActionName}()`;
    }
  }
};

export const getStatusDetailsFromTestCafeError = (error: unknown) => {
  const originalError = asErrorLike(error) as Partial<Error> & { rawMessage?: unknown };
  const wrapperError = getTestCafeErrorLike(error);
  const [errMsg] = toScalarStrings(wrapperError.errMsg);
  const [rawMessage] = toScalarStrings(originalError.rawMessage);
  const [actual] = toScalarStrings(wrapperError.actual);
  const [expected] = toScalarStrings(wrapperError.expected);
  const message =
    errMsg ??
    (rawMessage ? stripAnsi(rawMessage) : undefined) ??
    (typeof originalError.message === "string" ? stripAnsi(originalError.message) : undefined);
  const trace = typeof originalError.stack === "string" ? stripAnsi(originalError.stack) : undefined;

  return {
    message,
    trace,
    actual,
    expected,
  };
};

export const getActionStatusFromError = (error: unknown, command?: TestCafeFormattedCommand) => {
  const status = getStatusFromError(asErrorLike(error));
  const statusDetails = getStatusDetailsFromTestCafeError(error);
  const commandActual = command?.actual !== undefined ? formatActionValue(command.actual) : undefined;
  const commandExpected = command?.expected !== undefined ? formatActionValue(command.expected) : undefined;
  const fallbackText = statusDetails.message || statusDetails.trace ? undefined : formatErrorFallbackText(error);
  const isAssertion = command?.type === "assertion" || isAssertionLikeError(error);

  return {
    status: isAssertion
      ? Status.FAILED
      : status === Status.PASSED || status === Status.SKIPPED
        ? Status.BROKEN
        : status,
    statusDetails: updateStatusDetailsFromFallback(
      {
        ...statusDetails,
        actual: statusDetails.actual ?? commandActual,
        expected: statusDetails.expected ?? commandExpected,
      },
      fallbackText,
    ),
  };
};

export const createActionLogEntry = (
  event: "start" | "done",
  apiActionName: string,
  info: TestCafeReporterActionInfo,
) => {
  const errorInfo = info.err ? getActionStatusFromError(info.err) : undefined;

  return {
    event,
    apiActionName,
    stepName: formatActionStepName(apiActionName, info.command),
    actionId: typeof info.command.actionId === "string" ? info.command.actionId : undefined,
    browser: info.browser?.prettyUserAgent ?? info.browser?.userAgent,
    duration: info.duration,
    status: errorInfo?.status,
    statusDetails: errorInfo?.statusDetails,
    command: sanitizeActionValue(info.command),
  };
};

export const serializeActionLogs = (
  actionLogsByTestRunId: Record<string, ReturnType<typeof createActionLogEntry>[]>,
  browsers: TestCafeBrowserInfo[],
) =>
  JSON.stringify(
    {
      browsers: browsers.map((browser) => ({
        testRunId: browser.testRunId,
        name: browser.prettyUserAgent ?? browser.userAgent,
      })),
      actions: sanitizeActionValue(actionLogsByTestRunId),
    },
    null,
    2,
  );

export const getRelativeFixtureSelector = (fixturePath: string, fixtureName: string, rawTestName: string) => {
  const relativePath = getFixtureRelativePath(fixturePath);
  const cleanTitle = extractMetadataFromString(rawTestName).cleanTitle || rawTestName;

  return [relativePath, fixtureName, cleanTitle].filter(Boolean).join("#");
};

export const getEffectiveAllureId = (meta: Record<string, unknown>, rawTestName: string): string | undefined => {
  const [metaId] = toScalarStrings(meta["allure.id"]);
  if (metaId) {
    return metaId;
  }

  const titleLabels = extractMetadataFromString(rawTestName).labels;

  return titleLabels.find((label) => label.name === LabelName.ALLURE_ID)?.value;
};

export const getRuntimeMessagesByTestRun = (testRunInfo: TestCafeTestRunInfo): RuntimeMessagesByTestRun => {
  const result: RuntimeMessagesByTestRun = {};

  for (const [testRunId, payloads] of Object.entries(testRunInfo.reportData ?? {})) {
    for (const payload of payloads) {
      if (!isAllureRuntimeEnvelope(payload)) {
        continue;
      }

      result[testRunId] ??= [];
      result[testRunId].push(payload.message);
    }
  }

  return result;
};

export const isAllureRuntimeEnvelope = (value: unknown): value is AllureTestCafeRuntimeEnvelope =>
  isPlainObject(value) &&
  value.__allure_testcafe_runtime_message__ === true &&
  "message" in value &&
  isPlainObject(value.message);

export const serializeRuntimePayloads = (testRunInfo: TestCafeTestRunInfo, browsers: TestCafeBrowserInfo[]) => {
  const browserNamesById = new Map(
    browsers.map((browser) => [browser.testRunId, browser.prettyUserAgent ?? browser.userAgent ?? ""]),
  );
  const payloads = Object.entries(testRunInfo.reportData ?? {}).reduce<Record<string, unknown[]>>(
    (acc, [testRunId, values]) => {
      const allureValues = values.filter(isAllureRuntimeEnvelope);
      if (allureValues.length) {
        acc[testRunId] = allureValues.map((value) => value.message);
      }
      return acc;
    },
    {},
  );

  return JSON.stringify(
    {
      browsers: browsers.map((browser) => ({
        ...browser,
        name: browserNamesById.get(browser.testRunId),
      })),
      messages: payloads,
    },
    null,
    2,
  );
};

export const getScreenshotEntries = (testRunInfo: TestCafeTestRunInfo): TestCafeScreenshotInfo[] => {
  if (testRunInfo.screenshots?.length) {
    return testRunInfo.screenshots.filter((entry) => existsSync(entry.screenshotPath));
  }

  if (testRunInfo.screenshotPath && existsSync(testRunInfo.screenshotPath)) {
    return [
      {
        screenshotPath: testRunInfo.screenshotPath,
      },
    ];
  }

  return [];
};

export const getScreenshotName = (screenshot: TestCafeScreenshotInfo, index: number) => {
  const parts = [`Screenshot ${index + 1}`];

  if (screenshot.takenOnFail) {
    parts.push("on fail");
  }

  if (screenshot.userAgent) {
    parts.push(screenshot.userAgent);
  }

  if (typeof screenshot.quarantineAttempt === "number") {
    parts.push(`attempt ${screenshot.quarantineAttempt}`);
  }

  return parts.join(" - ");
};

export const getVideoEntries = (testRunInfo: TestCafeTestRunInfo): TestCafeVideoInfo[] =>
  (testRunInfo.videos ?? []).filter((entry) => existsSync(entry.videoPath));

export const getVideoName = (_video: TestCafeVideoInfo, index: number) => `Video ${index + 1}`;

export const getBrowserParameterValues = (browsers: TestCafeBrowserInfo[]) =>
  browsers
    .map((browser) => browser.prettyUserAgent ?? browser.userAgent)
    .filter((value): value is string => Boolean(value));

export const getBrowserInfoByTestRunId = (browsers: TestCafeBrowserInfo[]) =>
  new Map(browsers.map((browser) => [browser.testRunId, browser]));

export const getBrowserName = (browser?: TestCafeBrowserInfo) => browser?.prettyUserAgent ?? browser?.userAgent;

export const getBrowserStageName = (browser: TestCafeBrowserInfo, index: number) =>
  `Browser ${index + 1}: ${browser.prettyUserAgent ?? browser.userAgent ?? browser.testRunId}`;

export const getFormattedErrorText = (
  formatError: ((error: unknown, prefix?: string) => string) | undefined,
  errors: unknown[],
  formatErrorContext?: unknown,
) => {
  if (!formatError || errors.length === 0) {
    return undefined;
  }

  const formatted = errors.map((error) => stripAnsi(formatError.call(formatErrorContext, error))).join("\n\n");

  return formatted || undefined;
};

export const updateStatusDetailsFromFallback = (
  statusDetails: { message?: string; trace?: string; actual?: string; expected?: string },
  fallbackText: string | undefined,
) => {
  if (!fallbackText) {
    return statusDetails;
  }

  return {
    ...statusDetails,
    message: statusDetails.message ?? fallbackText,
    trace: statusDetails.trace ?? fallbackText,
  };
};

export const getWarningAttachmentContent = (warnings: string[]) =>
  warnings.map((warning) => stripAnsi(warning)).join("\n");

export const getQuarantineAttachmentContent = (quarantine: TestCafeTestRunInfo["quarantine"]) =>
  JSON.stringify(quarantine, null, 2);

export const createRuntimeAttachmentEnvelope = (message: RuntimeMessage): AllureTestCafeRuntimeEnvelope => ({
  __allure_testcafe_runtime_message__: true,
  message,
});

export const resolveTestPlan = (cwd?: string) => {
  const originalPath = process.env.ALLURE_TESTPLAN_PATH;

  if (originalPath && cwd && !path.isAbsolute(originalPath)) {
    process.env.ALLURE_TESTPLAN_PATH = path.resolve(cwd, originalPath);
  }

  try {
    return parseTestPlan();
  } finally {
    process.env.ALLURE_TESTPLAN_PATH = originalPath;
  }
};

export const PNG_CONTENT_TYPE = ContentType.PNG;
