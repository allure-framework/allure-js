import { serialize } from "allure-js-commons/sdk";
import { getConfig } from "./state.js";

export default (value: unknown) => {
  return isDomObject(value) ? stringifyAsDom(value) : serializeAsObject(value);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripAncestorRefs = (value: unknown, ancestors: object[] = []): unknown => {
  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};
  ancestors.push(value);

  for (const [key, prop] of Object.entries(value)) {
    if (typeof prop === "object" && prop !== null) {
      if (ancestors.includes(prop)) {
        continue;
      }
      result[key] = stripAncestorRefs(prop, ancestors);
    } else {
      result[key] = prop;
    }
  }

  ancestors.pop();
  return result;
};

export const serializeAsObject = (value: unknown) => {
  if (isPlainObject(value)) {
    const cleaned = stripAncestorRefs(value);
    return serialize({ ...(cleaned as object) }, getSerializeOptions());
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
