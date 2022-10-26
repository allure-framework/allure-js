declare module "tap-out" {
  import EventEmitter from "events";

  function parser(): EventEmitter;

  export = parser;
}
