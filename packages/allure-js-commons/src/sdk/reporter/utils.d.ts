import type { EventEmitter } from "node:events";
import type { Label, Link, StepResult, TestResult } from "../../model.js";
import type { LinkConfig, LinkTemplate } from "./types.js";
import { FileSystemWriter } from "./writer/FileSystemWriter.js";
import { MessageWriter } from "./writer/MessageWriter.js";
export declare const randomUuid: () => `${string}-${string}-${string}-${string}-${string}`;
export declare const md5: (str: string) => string;
export declare const getTestResultHistoryId: (result: TestResult) => string;
export declare const getTestResultTestCaseId: (result: TestResult) => string | undefined;
export declare const getWorstTestStepResult: (steps: StepResult[]) => StepResult | undefined;
export declare const readImageAsBase64: (filePath: string) => Promise<string | undefined>;
export declare const getProjectRoot: () => string;
export declare const getRelativePath: (filepath: string) => string;
export declare const getPosixPath: (filepath: string) => string;
export declare const deepClone: <T>(obj: T) => T;
export declare const getSuiteLabels: (suites: readonly string[]) => Label[];
/**
 * Resolves suite labels for the given test results and add default lables if there is no any suite label.
 * @example
 * ```ts
 * ensureSuiteLabels({ labels: [{ name: "suite", value: "foo" }] }, ["bar"]) // => [{ name: "suite", value: "foo" }]
 * ensureSuiteLabels({ labels: [] }, ["bar"]) // => [{ name: "parentSuite", value: "bar" }]
 * ```
 * @param test - Test result to resolve suite labels for
 * @param defaultSuites - Default suites to add if there is no any suite label
 * @returns Actual suite labels
 */
export declare const ensureSuiteLabels: (test: Partial<TestResult>, defaultSuites: readonly string[]) => Label[];
export declare const escapeRegExp: (value: string) => string;
export declare const applyLinkTemplate: (template: LinkTemplate, value: string) => string;
export declare const formatLink: (templates: LinkConfig, link: Link) => Link;
export declare const formatLinks: (templates: LinkConfig, links: readonly Link[]) => Link[];
export declare const createDefaultWriter: (config: {
    resultsDir?: string;
    emitter?: EventEmitter;
}) => FileSystemWriter | MessageWriter;
