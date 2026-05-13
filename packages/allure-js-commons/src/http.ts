export const ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION = 1;
export const ALLURE_HTTP_EXCHANGE_CONTENT_TYPE = "application/vnd.allure.http+json";
export const ALLURE_HTTP_EXCHANGE_FILE_EXTENSION = ".httpexchange";
export const ALLURE_HTTP_REDACTED_VALUE = "__ALLURE_REDACTED__";

export type HttpExchangeNameValue = {
  name: string;
  value: string;
};

export type HttpExchangeCookie = HttpExchangeNameValue & {
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
};

export type HttpExchangeBodyPart = {
  name?: string;
  fileName?: string;
  headers?: HttpExchangeNameValue[];
  contentType?: string;
  encoding?: "utf8" | "base64";
  value?: string;
  size?: number;
  truncated?: boolean;
};

export type HttpExchangeStream = {
  type?: string;
  complete?: boolean;
  chunkCount?: number;
};

export type HttpExchangeBody = {
  contentType?: string;
  encoding?: "utf8" | "base64";
  value?: string;
  size?: number;
  truncated?: boolean;
  form?: HttpExchangeNameValue[];
  parts?: HttpExchangeBodyPart[];
  stream?: HttpExchangeStream;
};

export type HttpExchangeRequest = {
  method: string;
  url: string;
  httpVersion?: string;
  cookies?: HttpExchangeCookie[];
  headers?: HttpExchangeNameValue[];
  query?: HttpExchangeNameValue[];
  body?: HttpExchangeBody;
  trailers?: HttpExchangeNameValue[];
};

export type HttpExchangeInformationalResponse = {
  status?: number;
  statusText?: string;
  headers?: HttpExchangeNameValue[];
};

export type HttpExchangeResponse = {
  status?: number;
  statusText?: string;
  httpVersion?: string;
  cookies?: HttpExchangeCookie[];
  headers?: HttpExchangeNameValue[];
  body?: HttpExchangeBody;
  trailers?: HttpExchangeNameValue[];
  informationalResponses?: HttpExchangeInformationalResponse[];
};

export type HttpExchangeError = {
  name?: string;
  message?: string;
  stack?: string;
};

export type HttpExchange = {
  schemaVersion: typeof ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION;
  request: HttpExchangeRequest;
  response?: HttpExchangeResponse;
  error?: HttpExchangeError;
  start?: number;
  stop?: number;
};
