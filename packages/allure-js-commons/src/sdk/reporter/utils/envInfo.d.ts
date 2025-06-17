/**
 * The implementation is based on https://github.com/gagle/node-properties.
 */
import type { EnvironmentInfo } from "../../types.js";
export declare const stringifyEnvInfo: (envInfo: EnvironmentInfo) => string;
export declare const parseEnvInfo: (input: string) => EnvironmentInfo;
