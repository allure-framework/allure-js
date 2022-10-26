import EventEmitter from "events";
import duplexer from "duplexer";
import minimist from "minimist";
import parser from "tap-out";
import through2 from "through2";

const allureTap = (process: NodeJS.Process): EventEmitter => {
  const args = minimist(process.argv.slice(2));
  const resultsDir = args["results-dir"] as string || "";

  const out = through2();
  const tap = parser();
  const stream = duplexer(tap, out);

  tap.on("assert", (...res: any[]) => {
    // eslint-disable-next-line
    console.log("assert", res);
  });
  tap.on("comment", (...res: any[]) => {
    // eslint-disable-next-line
    console.log("comment", res);
  });
  tap.on("extra", (...res: any[]) => {
    // eslint-disable-next-line
    console.log("extra", res);
  });
  tap.on("output", (...res: any[]) => {
    // eslint-disable-next-line
    console.log("output", res);
  });

  return stream;
};

export default allureTap;
