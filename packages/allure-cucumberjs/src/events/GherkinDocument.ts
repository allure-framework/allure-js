import { GherkinStep } from "./GherkinStep";
import { GherkinTestCase } from "./GherkinTestCase";

export class GherkinDocument {
  type?: string;
  feature?: {
    type: string;
    tags: {
      name: string;
    }[];
    name: string;
    description: string;
    children: GherkinTestCase[];
  };
  comments: string[] = [];

  stepMap?: Map<number, GherkinStep>; // not from input, internal; steps from backgrounds
  caseMap?: Map<number, GherkinTestCase>;
}
