import md5 from "md5";
import { Crypto } from "../Crypto.js";

export class AllureBrowserCrypto extends Crypto {
  uuid(): string {
    return globalThis.crypto.randomUUID();
  }

  md5(str: string): string {
    return md5(str);
  }
}
