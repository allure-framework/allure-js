import { createHash, randomUUID } from "node:crypto";
import type { Crypto } from "../types.js";

export class AllureNodeCrypto implements Crypto {
  uuid(): string {
    return randomUUID();
  }

  md5(str: string): string {
    return createHash("md5").update(str).digest("hex");
  }
}
