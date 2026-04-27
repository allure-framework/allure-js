import { inspect } from "node:util";

const tokenPattern = /%%|%[#sdifjop]/g;
const objectPattern = /\$([A-Za-z_][A-Za-z0-9_]*)/g;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const formatJsonValue = (value: unknown) => {
  const serialized = JSON.stringify(value);

  return serialized ?? String(value);
};

const formatPrettyValue = (value: unknown) => {
  const bun = (globalThis as any).Bun;

  if (typeof bun?.inspect === "function") {
    return bun.inspect(value);
  }

  return inspect(value, {
    colors: false,
    compact: false,
    depth: Infinity,
    sorted: false,
  });
};

export type NormalizedEachRow = {
  raw: unknown;
  args: unknown[];
  index: number;
  supportsIndexPlaceholder: boolean;
  objectValues?: Record<string, unknown>;
};

export const normalizeEachRows = (table: readonly unknown[]): NormalizedEachRow[] => {
  return table.map((raw, index) => {
    const args = Array.isArray(raw) ? raw : [raw];
    const firstArg = args[0];

    return {
      raw,
      args,
      index,
      supportsIndexPlaceholder: !Array.isArray(raw) || args.length === 1,
      objectValues: isRecord(raw) ? raw : args.length === 1 && isRecord(firstArg) ? firstArg : undefined,
    };
  });
};

const formatSequentialToken = (token: string, value: unknown) => {
  switch (token) {
    case "%s":
      return String(value);
    case "%d":
      return String(Number(value));
    case "%i":
      return String(parseInt(String(value), 10));
    case "%f":
      return String(Number(value));
    case "%j":
    case "%o":
      return formatJsonValue(value);
    case "%p":
      return formatPrettyValue(value);
    default:
      return token;
  }
};

export const formatEachTitle = (template: string, row: NormalizedEachRow) => {
  let argIndex = 0;

  const formatted = template.replace(tokenPattern, (token) => {
    if (token === "%%") {
      return "%";
    }

    if (token === "%#") {
      return row.supportsIndexPlaceholder ? String(row.index) : token;
    }

    if (argIndex >= row.args.length) {
      return token;
    }

    const value = row.args[argIndex]!;
    argIndex += 1;

    return formatSequentialToken(token, value);
  });

  if (!row.objectValues) {
    return formatted;
  }

  return formatted.replace(objectPattern, (match, key) => {
    if (!(key in row.objectValues!)) {
      return match;
    }

    const value = row.objectValues![key];

    return isRecord(value) || Array.isArray(value) ? formatJsonValue(value) : String(value);
  });
};
