import {
  ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
  ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION,
  ALLURE_HTTP_REDACTED_VALUE,
  ContentType,
  attachment,
  type HttpExchange,
  type HttpExchangeBody,
  type HttpExchangeBodyPart,
  type HttpExchangeCookie,
  type HttpExchangeError,
  type HttpExchangeNameValue,
  type HttpExchangeRequest,
  type HttpExchangeResponse,
} from "allure-js-commons";

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type RedactionKind = "header" | "query" | "cookie" | "form";

export type RedactionContext = {
  kind: RedactionKind;
  name: string;
  value: string;
  request?: Request;
  response?: Response;
  url?: string;
};

export type RedactionMatcher = string | RegExp | ((name: string, value: string, context: RedactionContext) => boolean);

export type AllureFetchOptions = {
  attachmentName?: string | ((exchange: HttpExchange) => string);
  maxBodySize?: number;
  captureRequestBody?: boolean;
  captureResponseBody?: boolean;
  redactHeaders?: RedactionMatcher[];
  redactQueryParams?: RedactionMatcher[];
  redactCookies?: RedactionMatcher[];
  redactFormFields?: RedactionMatcher[];
  includeErrorStack?: boolean;
  throwAttachmentErrors?: boolean;
};

type ResolvedAllureFetchOptions = Required<
  Pick<
    AllureFetchOptions,
    | "captureRequestBody"
    | "captureResponseBody"
    | "includeErrorStack"
    | "maxBodySize"
    | "redactCookies"
    | "redactFormFields"
    | "redactHeaders"
    | "redactQueryParams"
    | "throwAttachmentErrors"
  >
> &
  Pick<AllureFetchOptions, "attachmentName"> & {
    fetch: FetchLike;
  };

type CapturedBytes = {
  bytes: Uint8Array;
  chunkCount: number;
  complete: boolean;
  totalBytes?: number;
  truncated: boolean;
};

const DEFAULT_MAX_BODY_SIZE = 64 * 1024;
const TEXT_DECODER = new TextDecoder();
const SENSITIVE_VALUE_MATCHERS = [/token/i, /password/i, /passwd/i, /secret/i, /api[-_]?key/i, /session/i];
const DEFAULT_HEADER_REDACTION_MATCHERS = [
  /^authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  ...SENSITIVE_VALUE_MATCHERS,
];
const DEFAULT_QUERY_REDACTION_MATCHERS = SENSITIVE_VALUE_MATCHERS;
const DEFAULT_COOKIE_REDACTION_MATCHERS = [/.*/];
const DEFAULT_FORM_REDACTION_MATCHERS = SENSITIVE_VALUE_MATCHERS;

const normalizeOptions = (fetchImpl: FetchLike, options: AllureFetchOptions): ResolvedAllureFetchOptions => {
  if (!fetchImpl) {
    throw new Error("allure-fetch requires a fetch implementation");
  }

  const maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;

  return {
    attachmentName: options.attachmentName,
    captureRequestBody: options.captureRequestBody ?? true,
    captureResponseBody: options.captureResponseBody ?? true,
    fetch: fetchImpl,
    includeErrorStack: options.includeErrorStack ?? false,
    maxBodySize: Number.isFinite(maxBodySize) && maxBodySize > 0 ? Math.floor(maxBodySize) : 0,
    redactCookies: options.redactCookies ?? DEFAULT_COOKIE_REDACTION_MATCHERS,
    redactFormFields: options.redactFormFields ?? DEFAULT_FORM_REDACTION_MATCHERS,
    redactHeaders: options.redactHeaders ?? DEFAULT_HEADER_REDACTION_MATCHERS,
    redactQueryParams: options.redactQueryParams ?? DEFAULT_QUERY_REDACTION_MATCHERS,
    throwAttachmentErrors: options.throwAttachmentErrors ?? false,
  };
};

export const withAllure = (fetchImpl: FetchLike, options: AllureFetchOptions = {}): FetchLike => {
  const config = normalizeOptions(fetchImpl, options);

  return async (input, init) => {
    const request = new Request(input, init);
    const start = Date.now();
    const requestPromise = captureRequest(request, config).catch(() => createMinimalRequest(request, config));

    try {
      const response = await config.fetch(request);
      const responseData = await captureResponse(response, request, config);
      const exchange: HttpExchange = {
        schemaVersion: ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION,
        start,
        stop: Date.now(),
        request: await requestPromise,
        response: responseData,
      };

      await writeExchangeAttachment(exchange, config);

      return response;
    } catch (err) {
      const exchange: HttpExchange = {
        schemaVersion: ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION,
        start,
        stop: Date.now(),
        request: await requestPromise,
        error: serializeError(err, config),
      };

      await writeExchangeAttachment(exchange, config, err);

      throw err;
    }
  };
};

export const instrumentGlobalFetch = (options: AllureFetchOptions = {}) => {
  const originalFetch = globalThis.fetch;

  if (!originalFetch) {
    throw new Error("allure-fetch can't instrument global fetch because globalThis.fetch is not defined");
  }

  const wrappedFetch = withAllure(originalFetch.bind(globalThis), options);

  globalThis.fetch = wrappedFetch as typeof globalThis.fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
};

const captureRequest = async (request: Request, config: ResolvedAllureFetchOptions): Promise<HttpExchangeRequest> => {
  const headers = captureHeaders(request.headers, config, {
    kind: "header",
    request,
    url: request.url,
  });
  const requestData: HttpExchangeRequest = {
    method: request.method,
    url: request.url,
  };
  const query = captureQuery(request.url, config, request);
  const cookies = captureRequestCookies(request, config);

  if (headers.length) {
    requestData.headers = headers;
  }

  if (query.length) {
    requestData.query = query;
  }

  if (cookies.length) {
    requestData.cookies = cookies;
  }

  if (config.captureRequestBody) {
    const body = await captureRequestBody(request, config);

    if (body) {
      requestData.body = body;
    }
  }

  return requestData;
};

const createMinimalRequest = (request: Request, config: ResolvedAllureFetchOptions): HttpExchangeRequest => {
  const query = captureQuery(request.url, config, request);

  return {
    method: request.method,
    url: request.url,
    ...(query.length ? { query } : {}),
  };
};

const captureResponse = async (
  response: Response,
  request: Request,
  config: ResolvedAllureFetchOptions,
): Promise<HttpExchangeResponse> => {
  const responseData: HttpExchangeResponse = {
    status: response.status,
    statusText: response.statusText,
  };
  const headers = captureHeaders(response.headers, config, {
    kind: "header",
    request,
    response,
    url: response.url || request.url,
  });
  const cookies = captureResponseCookies(response, request, config);

  if (headers.length) {
    responseData.headers = headers;
  }

  if (cookies.length) {
    responseData.cookies = cookies;
  }

  if (config.captureResponseBody) {
    const body = await captureRawBody(response.clone(), response.headers, config, {
      request,
      response,
      url: response.url || request.url,
    });

    if (body) {
      responseData.body = body;
    }
  }

  return responseData;
};

const captureHeaders = (
  headers: Headers,
  config: ResolvedAllureFetchOptions,
  context: Omit<RedactionContext, "name" | "value">,
): HttpExchangeNameValue[] => {
  const result: HttpExchangeNameValue[] = [];

  headers.forEach((value, name) => {
    result.push({
      name,
      value: redactValue(name, value, config.redactHeaders, {
        ...context,
        name,
        value,
      }),
    });
  });

  return result;
};

const captureQuery = (url: string, config: ResolvedAllureFetchOptions, request: Request): HttpExchangeNameValue[] => {
  try {
    const parsedUrl = new URL(url, "https://allurereport.org");
    const result: HttpExchangeNameValue[] = [];

    parsedUrl.searchParams.forEach((value, name) => {
      result.push({
        name,
        value: redactValue(name, value, config.redactQueryParams, {
          kind: "query",
          name,
          request,
          url,
          value,
        }),
      });
    });

    return result;
  } catch {
    return [];
  }
};

const captureRequestCookies = (request: Request, config: ResolvedAllureFetchOptions): HttpExchangeCookie[] => {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return [];
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      const name = separatorIndex === -1 ? part : part.slice(0, separatorIndex).trim();
      const value = separatorIndex === -1 ? "" : part.slice(separatorIndex + 1).trim();

      return {
        name,
        value: redactValue(name, value, config.redactCookies, {
          kind: "cookie",
          name,
          request,
          url: request.url,
          value,
        }),
      };
    });
};

const captureResponseCookies = (
  response: Response,
  request: Request,
  config: ResolvedAllureFetchOptions,
): HttpExchangeCookie[] => {
  return getSetCookieHeaders(response.headers).map((header) => {
    const cookie = parseSetCookie(header);

    return {
      ...cookie,
      value: redactValue(cookie.name, cookie.value, config.redactCookies, {
        kind: "cookie",
        name: cookie.name,
        request,
        response,
        url: response.url || request.url,
        value: cookie.value,
      }),
    };
  });
};

const getSetCookieHeaders = (headers: Headers): string[] => {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;

  if (typeof getSetCookie === "function") {
    return getSetCookie.call(headers);
  }

  const header = headers.get("set-cookie");

  return header ? [header] : [];
};

const parseSetCookie = (header: string): HttpExchangeCookie => {
  const [pair = "", ...attributes] = header.split(";").map((part) => part.trim());
  const separatorIndex = pair.indexOf("=");
  const cookie: HttpExchangeCookie = {
    name: separatorIndex === -1 ? pair : pair.slice(0, separatorIndex).trim(),
    value: separatorIndex === -1 ? "" : pair.slice(separatorIndex + 1).trim(),
  };

  for (const attribute of attributes) {
    const [rawName, ...rawValueParts] = attribute.split("=");
    const name = rawName.trim().toLowerCase();
    const value = rawValueParts.join("=").trim();

    if (name === "path") {
      cookie.path = value;
    } else if (name === "domain") {
      cookie.domain = value;
    } else if (name === "expires") {
      cookie.expires = value;
    } else if (name === "httponly") {
      cookie.httpOnly = true;
    } else if (name === "secure") {
      cookie.secure = true;
    } else if (name === "samesite") {
      cookie.sameSite = value;
    }
  }

  return cookie;
};

const captureRequestBody = async (
  request: Request,
  config: ResolvedAllureFetchOptions,
): Promise<HttpExchangeBody | undefined> => {
  if (!request.body) {
    return undefined;
  }

  const contentType = request.headers.get("content-type") ?? undefined;

  if (contentType && isMultipartContentType(contentType)) {
    const multipartBody = await captureMultipartRequestBody(request.clone(), contentType, config);

    if (multipartBody) {
      return multipartBody;
    }
  }

  return captureRawBody(request.clone(), request.headers, config, {
    request,
    url: request.url,
  });
};

const captureMultipartRequestBody = async (
  request: Request,
  contentType: string,
  config: ResolvedAllureFetchOptions,
): Promise<HttpExchangeBody | undefined> => {
  try {
    const formData = await request.formData();
    const parts: HttpExchangeBodyPart[] = [];

    formData.forEach((value, name) => {
      if (typeof value === "string") {
        const safeValue = redactValue(name, value, config.redactFormFields, {
          kind: "form",
          name,
          request,
          url: request.url,
          value,
        });

        parts.push({
          name,
          encoding: "utf8",
          value: safeValue,
          size: byteLength(safeValue),
          truncated: false,
        });
      } else {
        parts.push({
          name,
          fileName: "name" in value && typeof value.name === "string" ? value.name : undefined,
          contentType: value.type || undefined,
          size: value.size,
          truncated: false,
        });
      }
    });

    return {
      contentType,
      size: parseContentLength(request.headers),
      truncated: false,
      parts,
    };
  } catch {
    return undefined;
  }
};

const captureRawBody = async (
  bodySource: Request | Response,
  headers: Headers,
  config: ResolvedAllureFetchOptions,
  context: Omit<RedactionContext, "kind" | "name" | "value">,
): Promise<HttpExchangeBody | undefined> => {
  if (!bodySource.body) {
    return undefined;
  }

  const contentType = headers.get("content-type") ?? undefined;
  const captured = await readBodyBytes(bodySource.body, config.maxBodySize);
  const textBody = isTextContentType(contentType);
  const body: HttpExchangeBody = {
    contentType,
    encoding: textBody ? "utf8" : "base64",
    size: parseContentLength(headers) ?? (captured.complete ? captured.totalBytes : undefined),
    truncated: captured.truncated,
  };

  if (!captured.complete) {
    body.stream = {
      complete: false,
      chunkCount: captured.chunkCount,
      type: streamTypeFromContentType(contentType),
    };
  }

  if (textBody) {
    const value = TEXT_DECODER.decode(captured.bytes);

    if (isUrlEncodedContentType(contentType)) {
      const { form, redactedValue } = redactUrlEncodedForm(value, config, context);

      body.value = redactedValue;
      body.form = form;
    } else {
      body.value = value;
    }
  } else {
    body.value = Buffer.from(captured.bytes).toString("base64");
  }

  return body;
};

const readBodyBytes = async (stream: ReadableStream<Uint8Array>, maxBodySize: number): Promise<CapturedBytes> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let capturedBytes = 0;
  let chunkCount = 0;
  let complete = true;
  let totalBytes = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      chunkCount += 1;
      totalBytes += value.byteLength;

      if (capturedBytes < maxBodySize) {
        const remainingBytes = maxBodySize - capturedBytes;

        if (value.byteLength <= remainingBytes) {
          chunks.push(value);
          capturedBytes += value.byteLength;
        } else {
          chunks.push(value.slice(0, remainingBytes));
          capturedBytes = maxBodySize;
          truncated = true;
          complete = false;
          void reader.cancel().catch(() => undefined);
          break;
        }
      } else {
        truncated = true;
        complete = false;
        void reader.cancel().catch(() => undefined);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return {
    bytes: concatUint8Arrays(chunks, capturedBytes),
    chunkCount,
    complete,
    totalBytes,
    truncated,
  };
};

const concatUint8Arrays = (chunks: Uint8Array[], length: number): Uint8Array => {
  const result = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return result;
};

const redactUrlEncodedForm = (
  value: string,
  config: ResolvedAllureFetchOptions,
  context: Omit<RedactionContext, "kind" | "name" | "value">,
) => {
  const sourceParams = new URLSearchParams(value);
  const redactedParams = new URLSearchParams();
  const form: HttpExchangeNameValue[] = [];

  sourceParams.forEach((fieldValue, name) => {
    const safeValue = redactValue(name, fieldValue, config.redactFormFields, {
      ...context,
      kind: "form",
      name,
      value: fieldValue,
    });

    redactedParams.append(name, safeValue);
    form.push({
      name,
      value: safeValue,
    });
  });

  return {
    form,
    redactedValue: redactedParams.toString(),
  };
};

const writeExchangeAttachment = async (
  exchange: HttpExchange,
  config: ResolvedAllureFetchOptions,
  originalError?: unknown,
) => {
  const attachmentName =
    typeof config.attachmentName === "function"
      ? config.attachmentName(exchange)
      : (config.attachmentName ?? "HTTP Exchange");
  try {
    await attachment(attachmentName, JSON.stringify(exchange), {
      contentType: ContentType.HTTP_EXCHANGE,
      fileExtension: ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
    });
  } catch (err) {
    if (config.throwAttachmentErrors && originalError === undefined) {
      throw err;
    }
  }
};

const redactValue = (name: string, value: string, matchers: RedactionMatcher[], context: RedactionContext): string =>
  shouldRedact(name, value, matchers, context) ? ALLURE_HTTP_REDACTED_VALUE : value;

const shouldRedact = (name: string, value: string, matchers: RedactionMatcher[], context: RedactionContext): boolean =>
  matchers.some((matcher) => {
    if (typeof matcher === "string") {
      return matcher.toLowerCase() === name.toLowerCase();
    }

    if (matcher instanceof RegExp) {
      matcher.lastIndex = 0;
      return matcher.test(name);
    }

    return matcher(name, value, context);
  });

const serializeError = (error: unknown, config: ResolvedAllureFetchOptions): HttpExchangeError => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: config.includeErrorStack ? error.stack : undefined,
    };
  }

  return {
    message: String(error),
  };
};

const parseContentLength = (headers: Headers): number | undefined => {
  const contentLength = headers.get("content-length");

  if (!contentLength) {
    return undefined;
  }

  const parsed = Number.parseInt(contentLength, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const byteLength = (value: string) => new TextEncoder().encode(value).byteLength;

const isTextContentType = (contentType?: string): boolean => {
  if (!contentType) {
    return true;
  }

  const normalized = contentType.split(";")[0].trim().toLowerCase();

  return (
    normalized.startsWith("text/") ||
    normalized === "application/json" ||
    normalized === "application/javascript" ||
    normalized === "application/x-www-form-urlencoded" ||
    normalized === "application/xml" ||
    normalized.endsWith("+json") ||
    normalized.endsWith("+xml")
  );
};

const isUrlEncodedContentType = (contentType?: string): boolean =>
  contentType?.split(";")[0].trim().toLowerCase() === "application/x-www-form-urlencoded";

const isMultipartContentType = (contentType?: string): boolean =>
  contentType?.split(";")[0].trim().toLowerCase() === "multipart/form-data";

const streamTypeFromContentType = (contentType?: string): string => {
  const normalized = contentType?.split(";")[0].trim().toLowerCase();

  if (normalized === "text/event-stream") {
    return "server-sent-events";
  }

  if (normalized === "application/grpc") {
    return "grpc";
  }

  return "chunked";
};
