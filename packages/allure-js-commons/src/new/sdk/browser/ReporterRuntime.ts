import md5 from "md5";
import { ReporterRuntime } from "../ReporterRuntime";
import { Writer } from "../Writer";
import { LifecycleListener } from "../LifecycleListener.js";

export class AllureBrowserReporterRuntime extends ReporterRuntime {
  constructor({ writer, listeners }: { writer: Writer; listeners?: LifecycleListener[] }) {
    super({
      writer,
      listeners,
      crypto: {
        uuid: () => {
          return globalThis.crypto.randomUUID();
        },
        md5: (data: string) => {
          return md5(data);
        },
      },
    });
  }
}
