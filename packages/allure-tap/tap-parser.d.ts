declare module "tap-parser" {
  import { Writable } from "stream";

  export type Plan = {
    start: number;
    end: number;
  };

  export type FinalPlan = {
    start: number;
    end: number;
    skipAll: boolean;
    skipReason: string;
    comment: string;
  };

  export type Line = string;

  export type BailoutReason = {
    // TODO:
  };

  export type Comment = string;

  export type Version = number;

  export type ChildParser = {
    // TODO:
  };

  export type Diag = {
    name: string;
    assertion: string;
    at: string;
    message?: string;
    values?: any[] | Record<string, string>;
  };

  export type Result = {
    id: number;
    name: string;
    fullname: string;
    ok: boolean;
    skip?: boolean;
    todo?: boolean;
    diag?: Diag;
  };

  export type FinalResult = {
    ok: boolean;
    count: number;
    pass: number;
    fail: number;
    bailout: boolean;
    todo: number;
    skip: number;
    plan: FinalPlan;
    failures: Result[];
    time: number | null;
  };

  export type Extra = {
    // TODO:
  };

  interface Parser {
    on(event: "child", cb: (payload: ChildParser) => void): void;
    on(event: "plan", cb: (payload: Plan) => void): void;
    on(event: "line", cb: (payload: Line) => void): void;
    on(event: "comment", cb: (payload: Comment) => void): void;
    on(event: "version", cb: (payload: Version) => void): void;
    on(event: "bailout", cb: (payload: BailoutReason) => void): void;
    on(event: "extra", cb: (payload: Extra) => void): void;
    on(event: "assert" | "result" | "pass" | "fail" | "skip" | "todo", cb: (payload: Result) => void): void;
    on(event: "complete", cb: (payload: FinalResult) => void): void;
  }

  class TapParser extends Writable {}

  export default TapParser;
}
