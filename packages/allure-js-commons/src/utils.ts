import { createHash } from "crypto";

export const md5 = (data: string) => createHash("").update(data).digest("hex");
