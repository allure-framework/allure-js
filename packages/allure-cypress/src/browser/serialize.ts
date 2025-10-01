import { serialize } from "allure-js-commons/sdk";
import { getConfig } from "./state.js";

export default (value: unknown) => {
  const isOrigin = isInOriginContext();

  if (isOrigin) {
    return serializeSafely(value);
  }

  return isDomObject(value) ? stringifyAsDom(value) : serialize(value, getSerializeOptions());
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

const isInOriginContext = (): boolean => {
  try {
    if ((window as any).cypressOriginContext || (window as any).cypressOriginWindow) {
      return true;
    }

    const baseUrl = Cypress.config("baseUrl");
    const currentOrigin = window.location.origin;
    if (baseUrl && currentOrigin !== baseUrl) {
      return true;
    }

    if ((window as any).Cypress) {
      const cypressInstance = (window as any).Cypress;
      if (cypressInstance && cypressInstance.state && cypressInstance.state("origin")) {
        return true;
      }
    }

    if (typeof cy === "undefined" || typeof cy.task === "undefined") {
      return true;
    }

    return false;
  } catch {
    return true;
  }
};

const serializeSafely = (value: unknown): string => {
  try {
    if (value === null || value === undefined) {
      return String(value);
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return JSON.stringify(value);
    }

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        return JSON.stringify(value.map((item) => serializeSafely(item)));
      }

      const safeObject: Record<string, unknown> = {};
      try {
        for (const [key, val] of Object.entries(value)) {
          if (typeof key === "string" && key.length < 100) {
            // Avoid very long keys
            try {
              safeObject[key] = typeof val === "object" ? "[Object]" : val;
            } catch {
              safeObject[key] = "[Unserializable]";
            }
          }
        }
        return JSON.stringify(safeObject);
      } catch (error) {
        return "[Complex Object]";
      }
    }

    return String(value);
  } catch (error) {
    return "[Unserializable]";
  }
};
