import { serialize } from "allure-js-commons/sdk";
import { getConfig } from "./state.js";

export default (value: unknown) => {
  return isDomObject(value) ? stringifyAsDom(value) : serializeAsObject(value);
};

const serializeAsObject = (value: unknown) => {
  if (typeof value === "object" && !Array.isArray(value)) {
    value = { ...value };
  }
  return serialize(value, getSerializeOptions());
};

const getSerializeOptions = () => {
  const {
    stepsFromCommands: { maxArgumentDepth: maxDepth, maxArgumentLength: maxLength },
  } = getConfig();

  return { maxDepth, maxLength, nonNullReplacerWithDomSupport };
};

const isDomObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null && Cypress.dom.isDom(value);

// @ts-ignore
const stringifyAsDom = (value: object) => Cypress.dom.stringify(value, "long");

const nonNullReplacerWithDomSupport = (_: string, value: unknown) => {
  if (typeof value === "object") {
    // Exclude null properties to make the result more compact.
    if (value === null) {
      return undefined;
    }

    if (Cypress.dom.isDom(value)) {
      // Window, document, and DOM element properties are serialized with Cypress.dom.stringify.
      return stringifyAsDom(value);
    }
  }

  // Use the implementation from allure-js-commons/sdk in all other cases.
  return value;
};
