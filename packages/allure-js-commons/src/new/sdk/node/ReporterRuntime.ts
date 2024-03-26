import { LifecycleListener } from "../LifecycleListener.js";
import { ReporterRuntime } from "../ReporterRuntime.js";
import { Writer } from "../Writer.js";
import { AllureNodeCrypto } from "./Crypto.js";

export class AllureNodeReporterRuntime extends ReporterRuntime {
  constructor({ writer, listeners }: { writer: Writer; listeners?: LifecycleListener[] }) {
    super({
      writer,
      listeners,
      crypto: new AllureNodeCrypto(),
    });
  }
}
