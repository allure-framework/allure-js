import { Config } from "../Config.js";
import { ReporterRuntime } from "../ReporterRuntime.js";
import { AllureBrowserCrypto } from "./Crypto.js";

export class AllureBrowserReporterRuntime extends ReporterRuntime {
  constructor({ writer, listeners, links, environmentInfo, categories }: Config) {
    super({
      writer,
      listeners,
      links,
      categories,
      environmentInfo,
      crypto: new AllureBrowserCrypto(),
    });
  }
}
