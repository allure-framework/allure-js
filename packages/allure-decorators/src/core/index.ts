import { Allure, ContentType, Severity } from "allure-js-commons";
import { processDescriptor } from "./descriptor";

type TestDecorator = (
  target: unknown,
  property: string,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor;

/* eslint-disable no-shadow */
const enum LinkType {
  ISSUE = "issue",
  TMS = "tms",
}

const defaultTrackerAddress = "http://localhost";
let allure: Allure;
let pmsUrl: string;
let tmsUrl: string;

export const step = <T>(nameFn: string | ((arg: T) => string)) => {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const original: unknown = descriptor.value;
    let callable: (args: T) => void;

    if (typeof original === "function") {
      descriptor.value = function(...args: [T]) {
        try {
          const value: string = typeof nameFn === "function" ? nameFn.apply(this, args) : nameFn;
          callable = () => getAllure().step(value, () => original.apply(this, args));
        } catch (e) {
          /* eslint-disable no-console */
          console.error(`[ERROR] Failed to apply step decorator: ${e}`);
        }
        return callable ? callable.apply(this, args) : original.apply(this, args);
      };
    }
    return descriptor;
  };
};

export const attachment = <T>(name: string, type: ContentType) => {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const original: unknown = descriptor.value;
    let callable: (args: T) => void;

    if (typeof original === "function") {
      descriptor.value = function(...args: [T]) {
        try {
          const content: Buffer | string = original.apply(this, args);
          callable = () => getAllure().attachment(name, content, type);
        } catch (e) {
          /* eslint-disable no-console */
          console.error(`[ERROR] Failed to apply attachment decorator: ${e}`);
        }
        return callable ? callable.apply(this, args) : {};
      };
    }
    return descriptor;
  };
};

export const testCaseId = <T>(idFn: string | ((arg: T) => string)): TestDecorator => {
  return processDecorator(idFn, (id) => getAllure().link(`${getTmsUrl()}/${id}`, id, LinkType.TMS));
};

export const issue = <T>(idFn: string | ((arg: T) => string)): TestDecorator => {
  return processDecorator(idFn, (id) =>
    getAllure().link(`${getPmsUrl()}/${id}`, id, LinkType.ISSUE),
  );
};

export const feature = <T>(featureFn: string | ((arg: T) => string)): TestDecorator => {
  return processDecorator(featureFn, (name) => getAllure().feature(name));
};

export const story = <T>(storyFn: string | ((arg: T) => string)): TestDecorator => {
  return processDecorator(storyFn, (name) => getAllure().story(name));
};

export const severity = <T>(
  severityFn: Severity | string | ((arg: T) => string | Severity),
): TestDecorator => {
  return processDecorator(severityFn, (name) => getAllure().severity(name));
};

export const tag = <T>(tagFn: string | ((arg: T) => string)) => {
  return processDecorator(tagFn, (name) => getAllure().tag(name));
};

export const owner = <T>(ownerFn: string | ((arg: T) => string)) => {
  return processDecorator(ownerFn, (name) => getAllure().owner(name));
};

export const epic = <T>(epicFn: string | ((arg: T) => string)) => {
  return processDecorator(epicFn, (name) => getAllure().epic(name));
};

export const description = <T>(descriptionFn: string | ((arg: T) => string)) => {
  return processDecorator(descriptionFn, (text) => getAllure().description(text));
};

export const decorate = <T extends Allure>(allureInstance: T): void => {
  allure = allureInstance;
};

export const getAllure = <T extends Allure>(): T => {
  if (!allure) {
    throw new Error("Unable to find Allure implementation");
  }
  return allure as T;
};

export const assignTmsUrl = (url: string): void => {
  tmsUrl = url;
};

const getTmsUrl = (): string => {
  return tmsUrl || defaultTrackerAddress;
};

export const assignPmsUrl = (url: string): void => {
  pmsUrl = url;
};

const getPmsUrl = (): string => {
  return pmsUrl || defaultTrackerAddress;
};

const processDecorator = <T>(
  parameterFn: string | ((arg: T) => string),
  reporterFn: (arg: string) => void,
): TestDecorator => {
  return (target: unknown, property: string, descriptor: PropertyDescriptor) =>
    processDescriptor(parameterFn, reporterFn, descriptor);
};
