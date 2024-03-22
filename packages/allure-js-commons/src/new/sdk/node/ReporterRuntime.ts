import { createHash, randomUUID } from "node:crypto";
import { ReporterRuntime } from "../ReporterRuntime";
import { Writer } from "../Writer";
import { LifecycleListener } from "../LifecycleListener.js";

export class AllureNodeReporterRuntime extends ReporterRuntime {
  constructor({ writer, listeners }: { writer: Writer; listeners?: LifecycleListener[] }) {
    super({
      writer,
      listeners,
      crypto: {
        uuid: () => {
          return randomUUID();
        },
        md5: (data: string) => {
          return createHash("md5").update(data).digest("hex");
        },
      },
    });
  }
}
