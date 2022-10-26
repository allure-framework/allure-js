import EventEmitter from "events";
import { pipeline, Readable, Writable } from "stream";
import minimist from "minimist";
import Parser from "tap-parser";

const allureTap = (process: NodeJS.Process): NodeJS.WritableStream => {
  const args = minimist(process.argv.slice(2));
  const resultsDir = args["results-dir"] as string || "";

  // TODO: create d.ts file for `tap-parser`
  // eslint-disable-next-line
  // @ts-ignore
  const tap = new Parser();

  tap.on("assert", (...res: any[]) => {
    // eslint-disable-next-line
    console.log("assert", res);
  });
  tap.on("complete", (...res: any[]) => {
    // eslint-disable-next-line
    console.log("complete", res);
  });

  return process.stdin.pipe(tap);
};

export default allureTap;
