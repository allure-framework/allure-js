import type { AttachmentOptions } from "../../../model.js";
import { randomUuid } from "../utils.js";
import { EXTENSIONS_BY_TYPE } from "./extensions.js";

export const typeToExtension = (options: AttachmentOptions): string => {
  if (options.fileExtension) {
    return options.fileExtension.startsWith(".") ? options.fileExtension : `.${options.fileExtension}`;
  }

  return EXTENSIONS_BY_TYPE[options.contentType] || "";
};

export const buildAttachmentFileName = (options: Pick<AttachmentOptions, "fileExtension" | "contentType">): string => {
  const attachmentUuid = randomUuid();
  const attachmentExtension = typeToExtension({
    fileExtension: options.fileExtension,
    contentType: options.contentType,
  });

  return `${attachmentUuid}-attachment${attachmentExtension}`;
};
