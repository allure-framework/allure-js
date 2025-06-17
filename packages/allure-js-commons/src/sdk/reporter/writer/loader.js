import { FileSystemWriter } from "./FileSystemWriter.js";
import { InMemoryWriter } from "./InMemoryWriter.js";
import { MessageWriter } from "./MessageWriter.js";
const wellKnownWriters = {
    InMemoryWriter: InMemoryWriter,
    FileSystemWriter: FileSystemWriter,
    MessageWriter: MessageWriter,
};
export const resolveWriter = (value) => {
    if (typeof value === "string") {
        return createWriter(value);
    }
    else if (value instanceof Array) {
        return createWriter(value[0], value.slice(1));
    }
    return value;
};
const createWriter = (nameOrPath, args = []) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
    const ctorOrInstance = getKnownWriterCtor(nameOrPath) ?? requireWriterCtor(nameOrPath);
    return typeof ctorOrInstance === "function" ? new ctorOrInstance(...args) : ctorOrInstance;
};
const getKnownWriterCtor = (name) => wellKnownWriters[name];
const requireWriterCtor = (modulePath) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
    return require(modulePath);
};
//# sourceMappingURL=loader.js.map