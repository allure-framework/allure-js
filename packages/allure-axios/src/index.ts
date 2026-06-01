import {
  ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
  ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION,
  ALLURE_HTTP_REDACTED_VALUE,
  ContentType,
  attachment,
  type HttpExchange,
  type HttpExchangeBody,
  type HttpExchangeCookie,
  type HttpExchangeError,
  type HttpExchangeNameValue,
  type HttpExchangeRequest,
  type HttpExchangeResponse,
} from "allure-js-commons";
import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

export type RedactionKind = "header" | "query" | "cookie" | "form";

export type RedactionContext = {
  kind: RedactionKind;
  name: string;
  value: string;
  request?: InternalAxiosRequestConfig;
  response?: AxiosResponse;
  url?: string;
};

export type RedactionMatcher = string | RegExp | ((name: string, value: string, context: RedactionContext) => boolean);

export type AllureAxiosOptions = {
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

type ResolvedAllureAxiosOptions = Required<
  Pick<
    AllureAxiosOptions,
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
  Pick<AllureAxiosOptions, "attachmentName">;

type AxiosRequestState = {
  config: InternalAxiosRequestConfig;
  finished: boolean;
  request?: HttpExchangeRequest;
  start: number;
};

type HeaderSource = InternalAxiosRequestConfig["headers"] | AxiosResponse["headers"] | undefined;

type HeaderLike = {
  get?: (name: string) => unknown;
  getSetCookie?: () => string[];
  toJSON?: (asStrings?: boolean) => Record<string, unknown>;
};

const DEFAULT_MAX_BODY_SIZE = 64 * 1024;
const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();
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

const normalizeOptions = (options: AllureAxiosOptions): ResolvedAllureAxiosOptions => {
  const maxBodySize = options.maxBodySize ?? DEFAULT_MAX_BODY_SIZE;

  return {
    attachmentName: options.attachmentName,
    captureRequestBody: options.captureRequestBody ?? true,
    captureResponseBody: options.captureResponseBody ?? true,
    includeErrorStack: options.includeErrorStack ?? false,
    maxBodySize: Number.isFinite(maxBodySize) && maxBodySize > 0 ? Math.floor(maxBodySize) : 0,
    redactCookies: options.redactCookies ?? DEFAULT_COOKIE_REDACTION_MATCHERS,
    redactFormFields: options.redactFormFields ?? DEFAULT_FORM_REDACTION_MATCHERS,
    redactHeaders: options.redactHeaders ?? DEFAULT_HEADER_REDACTION_MATCHERS,
    redactQueryParams: options.redactQueryParams ?? DEFAULT_QUERY_REDACTION_MATCHERS,
    throwAttachmentErrors: options.throwAttachmentErrors ?? false,
  };
};

export const instrumentAxios = (instance: AxiosInstance, options: AllureAxiosOptions = {}): (() => void) => {
  if (!instance?.interceptors?.request || !instance.interceptors.response) {
    throw new Error("allure-axios requires an Axios instance");
  }

  const config = normalizeOptions(options);
  const requestStates = new WeakMap<InternalAxiosRequestConfig, AxiosRequestState>();

  const requestInterceptorId = instance.interceptors.request.use((requestConfig) => {
    const state: AxiosRequestState = {
      config: requestConfig,
      finished: false,
      start: Date.now(),
    };
    const originalAdapter = requestConfig.adapter ?? instance.defaults.adapter ?? axios.defaults.adapter;

    requestStates.set(requestConfig, state);
    requestConfig.adapter = createAllureAdapter(instance, originalAdapter, state, config, requestStates);

    return requestConfig;
  });

  const responseInterceptorId = instance.interceptors.response.use(
    async (response) => {
      await finishExchange(instance, response.config, config, requestStates, response);

      return response;
    },
    async (err) => {
      const axiosError = err as AxiosError;
      const requestConfig = axiosError.response?.config ?? axiosError.config;

      if (requestConfig) {
        await finishExchange(instance, requestConfig, config, requestStates, axiosError.response, err);
      }

      return Promise.reject(err);
    },
  );

  return () => {
    instance.interceptors.request.eject(requestInterceptorId);
    instance.interceptors.response.eject(responseInterceptorId);
  };
};

const createAllureAdapter = (
  instance: AxiosInstance,
  originalAdapter: InternalAxiosRequestConfig["adapter"],
  state: AxiosRequestState,
  config: ResolvedAllureAxiosOptions,
  requestStates: WeakMap<InternalAxiosRequestConfig, AxiosRequestState>,
): AxiosAdapter => {
  return async (adapterConfig) => {
    requestStates.set(adapterConfig, state);
    state.config = adapterConfig;
    state.request = await captureRequest(instance, adapterConfig, config);

    const adapter = axios.getAdapter(originalAdapter);

    return adapter(adapterConfig);
  };
};

const finishExchange = async (
  instance: AxiosInstance,
  requestConfig: InternalAxiosRequestConfig,
  config: ResolvedAllureAxiosOptions,
  requestStates: WeakMap<InternalAxiosRequestConfig, AxiosRequestState>,
  response?: AxiosResponse,
  originalError?: unknown,
) => {
  const state = requestStates.get(requestConfig);

  if (state?.finished) {
    return;
  }

  if (state) {
    state.finished = true;
  }

  const start = state?.start ?? Date.now();
  const request = state?.request ?? (await captureRequest(instance, requestConfig, config));
  const exchange: HttpExchange = {
    schemaVersion: ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION,
    start,
    stop: Date.now(),
    request,
  };

  if (response) {
    exchange.response = await captureResponse(response, config);
  }

  if (originalError !== undefined) {
    exchange.error = serializeError(originalError, config);
  }

  await writeExchangeAttachment(exchange, config, originalError);
};

const captureRequest = async (
  instance: AxiosInstance,
  request: InternalAxiosRequestConfig,
  config: ResolvedAllureAxiosOptions,
): Promise<HttpExchangeRequest> => {
  const url = resolveRequestUrl(instance, request);
  const requestData: HttpExchangeRequest = {
    method: (request.method ?? "GET").toUpperCase(),
    url,
  };
  const headers = captureHeaders(request.headers, config, {
    kind: "header",
    request,
    url,
  });
  const query = captureQuery(url, request, config);
  const cookies = captureRequestCookies(request, url, config);

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
    const body = await captureBody(request.data, request.headers, config, {
      request,
      url,
    });

    if (body) {
      requestData.body = body;
    }
  }

  return requestData;
};

const captureResponse = async (
  response: AxiosResponse,
  config: ResolvedAllureAxiosOptions,
): Promise<HttpExchangeResponse> => {
  const url = resolveResponseUrl(response);
  const responseData: HttpExchangeResponse = {
    status: response.status,
    statusText: response.statusText,
  };
  const headers = captureHeaders(response.headers, config, {
    kind: "header",
    request: response.config,
    response,
    url,
  });
  const cookies = captureResponseCookies(response, url, config);

  if (headers.length) {
    responseData.headers = headers;
  }

  if (cookies.length) {
    responseData.cookies = cookies;
  }

  if (config.captureResponseBody) {
    const body = await captureBody(response.data, response.headers, config, {
      request: response.config,
      response,
      url,
    });

    if (body) {
      responseData.body = body;
    }
  }

  return responseData;
};

const resolveRequestUrl = (instance: AxiosInstance, request: InternalAxiosRequestConfig): string => {
  try {
    return instance.getUri(request);
  } catch {
    return request.url ?? "";
  }
};

const resolveResponseUrl = (response: AxiosResponse): string => {
  const responseUrl = response.request?.res?.responseUrl ?? response.request?.responseURL;

  return typeof responseUrl === "string" && responseUrl ? responseUrl : (response.config.url ?? "");
};

const captureHeaders = (
  headers: HeaderSource,
  config: ResolvedAllureAxiosOptions,
  context: Omit<RedactionContext, "name" | "value">,
): HttpExchangeNameValue[] => {
  return getHeaderEntries(headers).map(({ name, value }) => ({
    name,
    value: redactValue(name, value, config.redactHeaders, {
      ...context,
      name,
      value,
    }),
  }));
};

const getHeaderEntries = (headers: HeaderSource): HttpExchangeNameValue[] => {
  const result: HttpExchangeNameValue[] = [];
  const source = normalizeHeadersSource(headers);

  if (!source) {
    return result;
  }

  for (const [name, rawValue] of Object.entries(source)) {
    for (const value of normalizeHeaderValues(rawValue)) {
      result.push({
        name,
        value,
      });
    }
  }

  return result;
};

const normalizeHeadersSource = (headers: HeaderSource): Record<string, unknown> | undefined => {
  if (!headers) {
    return undefined;
  }

  const headerLike = headers as HeaderLike;

  if (typeof headerLike.toJSON === "function") {
    return headerLike.toJSON(true);
  }

  return headers as Record<string, unknown>;
};

const normalizeHeaderValues = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(normalizeHeaderValues);
  }

  if (value === undefined || value === null || value === false) {
    return [];
  }

  return [String(value)];
};

const getHeaderValue = (headers: HeaderSource, name: string): string | undefined => {
  const headerLike = headers as HeaderLike | undefined;

  if (headerLike && typeof headerLike.get === "function") {
    const value = headerLike.get(name);
    const values = normalizeHeaderValues(value);

    if (values.length) {
      return values[0];
    }
  }

  const normalizedName = name.toLowerCase();

  return getHeaderEntries(headers).find((header) => header.name.toLowerCase() === normalizedName)?.value;
};

const captureQuery = (
  url: string,
  request: InternalAxiosRequestConfig,
  config: ResolvedAllureAxiosOptions,
): HttpExchangeNameValue[] => {
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

const captureRequestCookies = (
  request: InternalAxiosRequestConfig,
  url: string,
  config: ResolvedAllureAxiosOptions,
): HttpExchangeCookie[] => {
  const cookieHeader = getHeaderValue(request.headers, "cookie");

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
          url,
          value,
        }),
      };
    });
};

const captureResponseCookies = (
  response: AxiosResponse,
  url: string,
  config: ResolvedAllureAxiosOptions,
): HttpExchangeCookie[] => {
  return getSetCookieHeaders(response.headers).map((header) => {
    const cookie = parseSetCookie(header);

    return {
      ...cookie,
      value: redactValue(cookie.name, cookie.value, config.redactCookies, {
        kind: "cookie",
        name: cookie.name,
        request: response.config,
        response,
        url,
        value: cookie.value,
      }),
    };
  });
};

const getSetCookieHeaders = (headers: HeaderSource): string[] => {
  const headerLike = headers as HeaderLike | undefined;

  if (headerLike && typeof headerLike.getSetCookie === "function") {
    return headerLike.getSetCookie();
  }

  return getHeaderEntries(headers)
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map((header) => header.value);
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

const captureBody = async (
  data: unknown,
  headers: HeaderSource,
  config: ResolvedAllureAxiosOptions,
  context: Omit<RedactionContext, "kind" | "name" | "value">,
): Promise<HttpExchangeBody | undefined> => {
  if (data === undefined || data === null) {
    return undefined;
  }

  const contentType = getHeaderValue(headers, "content-type");
  const contentLength = parseContentLength(headers);

  if (isStreamLike(data) || isMultipartBody(data, contentType)) {
    return {
      contentType,
      size: contentLength,
      stream: {
        type: streamTypeFromContentType(contentType),
      },
      truncated: false,
    };
  }

  const serialized = await serializeBodyData(data);

  if (!serialized) {
    return undefined;
  }

  const captured = truncateBytes(serialized.bytes, config.maxBodySize);
  const textBody = serialized.text ?? isTextContentType(contentType);
  const body: HttpExchangeBody = {
    contentType,
    encoding: textBody ? "utf8" : "base64",
    size: contentLength ?? serialized.bytes.byteLength,
    truncated: captured.truncated,
  };

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

const serializeBodyData = async (data: unknown): Promise<{ bytes: Uint8Array; text?: boolean } | undefined> => {
  if (typeof data === "string") {
    return {
      bytes: TEXT_ENCODER.encode(data),
      text: true,
    };
  }

  if (data instanceof URLSearchParams) {
    return {
      bytes: TEXT_ENCODER.encode(data.toString()),
      text: true,
    };
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return {
      bytes: new Uint8Array(await data.arrayBuffer()),
      text: isTextContentType(data.type),
    };
  }

  if (data instanceof ArrayBuffer) {
    return {
      bytes: new Uint8Array(data),
      text: false,
    };
  }

  if (ArrayBuffer.isView(data)) {
    return {
      bytes: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      text: false,
    };
  }

  if (typeof data === "object") {
    try {
      const json = JSON.stringify(data);

      if (json !== undefined) {
        return {
          bytes: TEXT_ENCODER.encode(json),
          text: true,
        };
      }
    } catch {
      return undefined;
    }
  }

  return {
    bytes: TEXT_ENCODER.encode(String(data)),
    text: true,
  };
};

const truncateBytes = (bytes: Uint8Array, maxBodySize: number): { bytes: Uint8Array; truncated: boolean } => {
  if (bytes.byteLength <= maxBodySize) {
    return {
      bytes,
      truncated: false,
    };
  }

  return {
    bytes: bytes.slice(0, maxBodySize),
    truncated: true,
  };
};

const isStreamLike = (value: unknown): boolean => {
  return (
    typeof value === "object" &&
    value !== null &&
    ("pipe" in value || "read" in value || Symbol.asyncIterator in value) &&
    !(value instanceof URLSearchParams) &&
    !(value instanceof ArrayBuffer) &&
    !ArrayBuffer.isView(value)
  );
};

const isMultipartBody = (value: unknown, contentType?: string): boolean => {
  return isMultipartContentType(contentType) || isFormDataLike(value);
};

const isFormDataLike = (value: unknown): boolean => {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { append?: unknown }).append === "function" &&
    typeof (value as { getHeaders?: unknown }).getHeaders === "function"
  );
};

const redactUrlEncodedForm = (
  value: string,
  config: ResolvedAllureAxiosOptions,
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
  config: ResolvedAllureAxiosOptions,
  originalError?: unknown,
) => {
  const attachmentName =
    typeof config.attachmentName === "function"
      ? config.attachmentName(exchange)
      : (config.attachmentName ?? `${exchange.request.method} ${exchange.request.url}`);
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

const serializeError = (error: unknown, config: ResolvedAllureAxiosOptions): HttpExchangeError => {
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

const parseContentLength = (headers: HeaderSource): number | undefined => {
  const contentLength = getHeaderValue(headers, "content-length");

  if (!contentLength) {
    return undefined;
  }

  const parsed = Number.parseInt(contentLength, 10);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

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
