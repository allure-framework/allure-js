declare module "duplexer" {
  import EventEmitter from "events";

  function duplexer(input: EventEmitter, output: EventEmitter): EventEmitter;

  export = duplexer;
}
