export interface TestPlanV1 {
  version: "1.0";
  tests: {
    id: string | number;
    selector: string;
  }[];
}
