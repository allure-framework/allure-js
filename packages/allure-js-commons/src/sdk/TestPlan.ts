export interface TestPlanV1Test {
  id: string | number;
  selector: string;
}

export interface TestPlanV1 {
  version: "1.0";
  tests: TestPlanV1Test[];
}
