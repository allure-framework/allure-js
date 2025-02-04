export interface CodeceptError {
  params: any;
  template: string;
  showDiff: boolean;
  actual: string;
  expected: string;
  cliMessage: () => string;
  message: string;
  inspect: () => string;
}

export interface CodeceptStep {
  actor: string;
  name: string;
  helperMethod: string;
  suffix: string;
  prefix: string;
  comment: string;
  args: string[];
  status: string;
  metaStep: CodeceptStep;
  toString: () => string;
  isBDD: () => boolean;
}

export interface CodeceptBddStep {
  id: string;
  keyword: string;
  keywordType: string;
  text: string;
  startTime: number;
}
