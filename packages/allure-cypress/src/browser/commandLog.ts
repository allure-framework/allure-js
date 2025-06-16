import type { Parameter } from "allure-js-commons";
import type { CypressLogEntry, LogStepDescriptor } from "../types.js";
import { isDefined } from "../utils.js";
import { reportStepStart } from "./lifecycle.js";
import serializePropValue from "./serialize.js";
import { getCurrentStep, getStepStack, pushStep, setupStepFinalization } from "./state.js";
import { ALLURE_STEP_CMD_SUBJECT, findAndStopStepWithSubsteps, isLogStep } from "./steps.js";

export const shouldCreateStepFromCommandLogEntry = (entry: CypressLogEntry) => {
  const { event, instrument } = entry.attributes;
  if (instrument !== "command") {
    // We are interested in the "TEST BODY" panel only for now.
    // Other instruments are logged in separate panels.
    return false;
  }

  if (event) {
    // Events are tricky to report as they may span across commands and even leave the test's scope.
    // We ignore them for now.
    return false;
  }

  if (isApiStepErrorLogEntry(entry)) {
    // Cypress don't create a log message for 'cy.then' except when it throws an error.
    // This is in particularly happens when the function passed to 'allure.step' throws. In such a case however,
    // creating an extra step from the log entry is redundant because the error is already included in the report as
    // a part of the step.
    return false;
  }

  return true;
};

/**
 * Checks if the current step represents a cy.screenshot command log entry. If this is the case, associates the name
 * of the screenshot with the step. Later, that will allow converting the step with the attachment into the attachment
 * step.
 */
export const setupScreenshotAttachmentStep = (originalName: string | undefined, name: string) => {
  const step = getCurrentStep();
  if (step && isLogStep(step)) {
    const {
      name: commandName,
      props: { name: nameFromProps },
    } = step.log.attributes.consoleProps();
    if (commandName === "screenshot" && nameFromProps === originalName) {
      step.attachmentName = name;
    }
  }
};

export const startCommandLogStep = (entry: CypressLogEntry) => {
  const currentLogEntry = getCurrentLogEntry();

  if (typeof currentLogEntry !== "undefined" && shouldStopCurrentLogStep(currentLogEntry.log, entry)) {
    stopCommandLogStep(currentLogEntry.log.attributes.id);
  }

  pushLogEntry(entry);
  reportStepStart(entry.attributes.id, getCommandLogStepName(entry));
  scheduleCommandLogStepStop(entry);
};

export const stopCommandLogStep = (entryId: string) => findAndStopStepWithSubsteps(({ id }) => id === entryId);

const pushLogEntry = (entry: CypressLogEntry) => {
  const id = entry.attributes.id;
  const stepDescriptor: LogStepDescriptor = { id, type: "log", log: entry };

  pushStep(stepDescriptor);

  // Some properties of some Command Log entries are undefined at the time the entry is stopped. An example is the
  // Yielded property of some queries. We defer converting them to Allure step parameters until the test/hook ends.
  setupStepFinalization(stepDescriptor, (data) => {
    data.parameters = getCommandLogStepParameters(entry);

    if (stepDescriptor.attachmentName) {
      // Rename the step to match the attachment name. Once the names are the same, Allure will render the
      // attachment in the place of the step.
      data.name = stepDescriptor.attachmentName;
    }
  });
};

const scheduleCommandLogStepStop = (entry: CypressLogEntry) => {
  const { groupStart, end, id } = entry.attributes;
  if (end) {
    // Some entries are already completed (this is similar to the idea behind allure.logStep).
    // Cypress won't call entry.end() in such a case, so we need to stop such a step now.
    // Example: cy.log
    stopCommandLogStep(id);
  } else if (groupStart) {
    // A logging group must be stopped be the user via the Cypress.Log.endGroup() call.
    // If the call is missing, the corresponding step will be stopped either at the test's (the hook's) end.
    const originalEndGroup = entry.endGroup;
    entry.endGroup = function () {
      stopCommandLogStep(id);
      return originalEndGroup.call(this);
    };
  } else {
    // Regular log entries are finalized by Cypress via the Cypress.Log.end() call. We're hooking into this function
    // to complete the step at the same time.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalEnd = entry.end;
    entry.end = function () {
      stopCommandLogStep(id);
      return originalEnd.call(this);
    };
  }
};

const isApiStepErrorLogEntry = ({ attributes: { name, consoleProps } }: CypressLogEntry) =>
  name === "then" && Object.is(consoleProps().props["Applied To"], ALLURE_STEP_CMD_SUBJECT);

const getCommandLogStepName = (entry: CypressLogEntry) => {
  const { name, message, displayName } = entry.attributes;
  const resolvedName = (displayName ?? name).trim();
  const resolvedMessage = (
    maybeGetAssertionLogMessage(entry) ??
    maybeGetCucumberLogMessage(entry) ??
    (typeof entry?.attributes?.renderProps === "function" ? entry.attributes.renderProps().message : undefined) ??
    message
  ).trim();
  const stepName = [resolvedName, resolvedMessage].filter(Boolean).join(" ");
  return stepName;
};

const getCommandLogStepParameters = (entry: CypressLogEntry) =>
  getLogProps(entry)
    .map(([k, v]) => ({
      name: k.toString(),
      value: serializePropValue(v),
    }))
    .filter(getPropValueSetFilter(entry));

const WELL_KNOWN_CUCUMBER_LOG_NAMES = ["Given", "When", "Then", "And"];

const maybeGetCucumberLogMessage = (entry: CypressLogEntry) => {
  const {
    attributes: { name, message },
  } = entry;
  if (WELL_KNOWN_CUCUMBER_LOG_NAMES.includes(name.trim()) && message.startsWith("**") && message.endsWith("**")) {
    return message.substring(2, message.length - 2);
  }
};

const getLogProps = (entry: CypressLogEntry) => {
  const {
    attributes: { consoleProps },
  } = entry;
  const isAssertionWithMessage = !!maybeGetAssertionLogMessage(entry);
  const { props, name } = consoleProps();

  // accessing LocalStorage after the page reload can stick the test runner
  // to avoid the issue, we just need to log the command manually
  // the problem potentially can happen with other storage related commands, like `clearAllLocalStorage`, `clearAllSessionStorage`, `getAllLocalStorage`, `getAllSessionStorage`, `setLocalStorage`, `setSessionStorage`
  // but probably, we don't need to silent them all at this moment
  // the context: https://github.com/allure-framework/allure-js/issues/1222
  if (["clearLocalStorage"].includes(name)) {
    return [] as [string, unknown][];
  }

  // For assertion logs, we interpolate the 'Message' property, which contains unformatted assertion description,
  // directly into the step's name.
  // No need to keep the exact same information in the step's parameters.
  return Object.entries(props).filter(([k, v]) => isDefined(v) && !(isAssertionWithMessage && k === "Message"));
};

const maybeGetAssertionLogMessage = (entry: CypressLogEntry) => {
  if (isAssertLog(entry)) {
    const message = entry.attributes.consoleProps().props.Message;

    if (message && typeof message === "string") {
      return message;
    }
  }
};

const isAssertLog = ({ attributes: { name } }: CypressLogEntry) => name === "assert";

const getCurrentLogEntry = () => getStepStack().findLast(isLogStep);

const shouldStopCurrentLogStep = (currentLogEntry: CypressLogEntry, newLogEntry: CypressLogEntry) => {
  const { groupStart: currentEntryIsGroup, type: currentEntryType } = currentLogEntry.attributes;
  const { type: newEntryType } = newLogEntry.attributes;

  return !currentEntryIsGroup && (currentEntryType === "child" || newEntryType !== "child");
};

const getPropValueSetFilter = (entry: CypressLogEntry) =>
  entry.attributes.name === "wrap" ? () => true : ({ name, value }: Parameter) => name !== "Yielded" || value !== "{}";
