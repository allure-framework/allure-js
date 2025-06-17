import type { Label } from "../../model.js";
import type { TestPlanV1 } from "../types.js";
export declare const parseTestPlan: () => TestPlanV1 | undefined;
export declare const includedInTestPlan: (testPlan: TestPlanV1, subject: {
    id?: string;
    fullName?: string;
    tags?: string[];
}) => boolean;
export declare const addSkipLabel: (labels: Label[]) => void;
export declare const addSkipLabelAsMeta: (name: string) => string;
export declare const hasSkipLabel: (labels: readonly Label[]) => boolean;
