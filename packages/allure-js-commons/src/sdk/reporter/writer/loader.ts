import type { Writer, WriterDescriptor } from "../types.js";
import { FileSystemWriter } from "./FileSystemWriter.js";
import { InMemoryWriter } from "./InMemoryWriter.js";
import { MessageWriter } from "./MessageWriter.js";

type WellKnownWriters = {
  [key: string]: (new (...args: readonly any[]) => Writer) | undefined;
};

const wellKnownWriters: WellKnownWriters = {
  InMemoryWriter: InMemoryWriter,
  FileSystemWriter: FileSystemWriter,
  MessageWriter: MessageWriter,
};

export const resolveWriter = (value: Writer | WriterDescriptor): Writer => {
  if (typeof value === "string") {
    return createWriter(value);
  } else if (value instanceof Array) {
    return createWriter(value[0], value.slice(1));
  }
  return value;
};

const createWriter = (nameOrPath: string, args: readonly unknown[] = []) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const ctorOrInstance = getKnownWriterCtor(nameOrPath) ?? requireWriterCtor(nameOrPath);
  return typeof ctorOrInstance === "function" ? new ctorOrInstance(...args) : ctorOrInstance;
};

const getKnownWriterCtor = (name: string) =>
  (wellKnownWriters as unknown as { [key: string]: Writer | undefined })[name];

const requireWriterCtor = (modulePath: string): (new (...args: readonly unknown[]) => Writer) | Writer => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  return require(modulePath);
};
