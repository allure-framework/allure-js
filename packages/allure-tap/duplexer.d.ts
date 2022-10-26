declare module "duplexer" {
  import EventEmitter from "events";

  function duplexer(readable: EventEmitter, writable: EventEmitter): EventEmitter;

  export = duplexer;
}
