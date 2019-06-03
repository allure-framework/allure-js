import stream from "stream";

declare module "cucumber" {
  export class Cli {
    constructor(params: { argv: string[]; cwd: string; stdout: stream });
    run(): Promise<any>;
  }
}
