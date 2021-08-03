import { Example } from "./Example";
import { GherkinExample } from "./GherkinExample";
import { GherkinStep } from "./GherkinStep";

export class GherkinTestCase {
  type?: string;
  location?: {
    line: number;
  };
  tags?: {
    name: string;
  }[];
  name?: string;
  description?: string;
  steps: GherkinStep[] = [];
  stepMap: Map<number, GherkinStep> = new Map(); // not from input, internal bookkeeping
  examples?: GherkinExample[];
  example?: Example; // not from input, internal bookkeeping
}
