import type { AllureResults } from "../../types.js";
export declare class MessageReader {
    readonly results: AllureResults;
    handleMessage: (jsonMessage: string) => void;
    handleCustomMessage: (type: string, data: any, path: string) => void;
    attachResults: () => Promise<void>;
}
