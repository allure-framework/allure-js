import md5 from "md5";
import type { Crypto } from "../types.js";

export class AllureBrowserCrypto implements Crypto {
  uuid(): string {
    return globalThis.crypto.randomUUID();
  }

  md5(str: string): string {
    return md5(str);
  }
}
