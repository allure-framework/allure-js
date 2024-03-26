import { createHash, randomUUID } from "node:crypto";
import { Crypto } from "../Crypto.js";

export class AllureNodeCrypto extends Crypto {
  uuid(): string {
    return randomUUID();
  }

  md5(str: string): string {
    return createHash("md5").update(str).digest("hex");
  }
}
