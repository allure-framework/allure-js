import { randomUuid } from "../utils.js";
import { EXTENSIONS_BY_TYPE } from "./extensions.js";
export const typeToExtension = (options) => {
    if (options.fileExtension) {
        return options.fileExtension.startsWith(".") ? options.fileExtension : `.${options.fileExtension}`;
    }
    return EXTENSIONS_BY_TYPE[options.contentType] || "";
};
export const buildAttachmentFileName = (options) => {
    const attachmentUuid = randomUuid();
    const attachmentExtension = typeToExtension({
        fileExtension: options.fileExtension,
        contentType: options.contentType,
    });
    return `${attachmentUuid}-attachment${attachmentExtension}`;
};
//# sourceMappingURL=attachments.js.map