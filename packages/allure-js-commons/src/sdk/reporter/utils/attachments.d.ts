import type { AttachmentOptions } from "../../../model.js";
export declare const typeToExtension: (options: AttachmentOptions) => string;
export declare const buildAttachmentFileName: (options: Pick<AttachmentOptions, "fileExtension" | "contentType">) => string;
