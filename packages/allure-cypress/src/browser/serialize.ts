import { type SerializeOptions, serialize } from "allure-js-commons/sdk";

import { getConfig } from "./state.js";

export default (value: unknown) => {
  try {
    // Storage can belong to another window, so instanceof Storage is not reliable here.
    if (Object.prototype.toString.call(value) === "[object Storage]") {
      return "[object Storage]";
    }

    return serialize(isDomObject(value) ? stringifyAsDom(value) : value, getSerializeOptions());
  } catch {
    // Unexpected serialization errors must not interrupt the test lifecycle.
    return "[Unserializable value]";
  }
};

const getSerializeOptions = (): SerializeOptions => {
  // Use the same value limits for command parameters and assertion comparisons.
  const {
    stepsFromCommands: { maxArgumentDepth: maxDepth, maxArgumentLength: maxLength },
  } = getConfig();

  return { maxDepth, maxLength, replacer: replacerWithDomSupport };
};

const isDomObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null && Cypress.dom.isDom(value);

// @ts-ignore
const stringifyAsDom = (value: object) => Cypress.dom.stringify(value, "long");

const replacerWithDomSupport = (_: string, value: unknown) => (isDomObject(value) ? stringifyAsDom(value) : value);
