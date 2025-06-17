import type { Label } from "../../../model.js";
export declare const getEnvironmentLabels: () => Label[];
export declare const getHostLabel: () => Label;
export declare const getThreadLabel: (userProvidedThreadId?: string) => Label;
export declare const getPackageLabel: (filepath: string) => Label;
export declare const getLanguageLabel: () => Label;
export declare const getFrameworkLabel: (framework: string) => Label;
