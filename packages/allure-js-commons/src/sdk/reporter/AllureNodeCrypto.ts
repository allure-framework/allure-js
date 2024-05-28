import { createHash, randomUUID } from "node:crypto";

export class AllureNodeCrypto {
  uuid(): string {
    return randomUUID();
  }

  md5(str: string): string {
    return createHash("md5").update(str).digest("hex");
  }
}
