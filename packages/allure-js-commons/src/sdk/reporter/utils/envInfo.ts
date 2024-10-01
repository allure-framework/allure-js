import type { EnvironmentInfo } from "../../types.js";

const EOL = process.platform === "win32" ? "\r\n" : "\n";

export const stringifyEnvInfo = (envInfo: EnvironmentInfo) => {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(envInfo)) {
    if (value !== null && value !== undefined) {
      const escapedKey = escapeKey(key);
      const escapedValue = escapeValue(value ?? "");
      lines.push(`${escapedKey} = ${escapedValue}`);
    }
  }

  return lines.join(EOL);
};

const KEY_REPLACE_PATTERN = /([ =:])/g;

const escapeKey = (key: string) => {
  return key.replaceAll(KEY_REPLACE_PATTERN, "\\$1");
};

const escapeValue = (value: string) => {
  let result = "";
  let escapeWhitespace = true;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    const code = value.charCodeAt(i);

    if (!isWhitespace(code)) {
      escapeWhitespace = false;
    }

    result += escapeCharacter(char, code, escapeWhitespace);
  }
  return result;
};

const escapeCharacter = (char: string, code: number, escapeWhitespace: boolean) => {
  if (isAsciiPrintable(code)) {
    if (char === " " && escapeWhitespace) {
      return "\\ ";
    } else if (char === "\\") {
      return "\\\\";
    } else {
      return char;
    }
  } else if (char === "\t") {
    return "\\t";
  } else if (char === "\n") {
    return "\\n";
  } else if (char === "\f") {
    return "\\f";
  } else if (char === "\r") {
    return "\\r";
  } else if (code < 160 || code >= 256) {
    // Control sets 0 and 1 or non-ASCII
    return escapeUnicode(code);
  } else {
    return char;
  }
};

const isWhitespace = (code: number) => {
  switch (code) {
    case 9: // tab, \t
    case 12: // form feed, \f
    case 32: // space, " "
      return true;
  }
  return false;
};

const isAsciiPrintable = (code: number) => code > 31 && code < 127;

const escapeUnicode = (code: number) => {
  const unicode = code.toString(16);
  const prefix = "0".repeat(4 - unicode.length);
  return `\\u${prefix}${unicode}`;
};
