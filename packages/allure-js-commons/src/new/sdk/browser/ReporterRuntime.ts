import { LifecycleListener } from "../LifecycleListener.js";
import { ReporterRuntime } from "../ReporterRuntime.js";
import { Writer } from "../Writer.js";
import { AllureBrowserCrypto } from "./Crypto.js";

export class AllureBrowserReporterRuntime extends ReporterRuntime {
  constructor({ writer, listeners }: { writer: Writer; listeners?: LifecycleListener[] }) {
    super({
      writer,
      listeners,
      crypto: new AllureBrowserCrypto(),
    });
  }
}
