import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from "node:http";
import type { Socket } from "node:net";
import { Readable } from "node:stream";

import {
  ALLURE_HTTP_EXCHANGE_CONTENT_TYPE,
  ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
  ALLURE_HTTP_REDACTED_VALUE,
  type HttpExchange,
} from "allure-js-commons";
import type { RuntimeAttachmentContentMessage, RuntimeMessage } from "allure-js-commons/sdk";
import { MessageHolderTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { afterEach, describe, expect, it } from "vitest";

import { type AllureFetchOptions, type FetchLike, instrumentGlobalFetch, withAllure } from "../../src/index.js";

type TestResponseHeaders = Record<string, number | readonly string[] | string>;

type TestRouteAction =
  | {
      body?: Buffer | string;
      headers: TestResponseHeaders;
      status: number;
      type: "reply";
    }
  | {
      headers: TestResponseHeaders;
      status: number;
      stream: Readable;
      type: "stream";
    }
  | {
      type: "close";
    }
  | {
      type: "timeout";
    };

type TestRoute = {
  action: TestRouteAction;
  endpoint: TestEndpoint;
  method: string;
  path: string;
};

type TestMultipartPart = {
  data: Buffer;
  filename?: string;
  name?: string;
  type?: string;
};

type TestSeenRequest = {
  body: TestRequestBody;
  headers: IncomingHttpHeaders;
};

type TestHttpServer = {
  forGet: (path: string) => TestRequestBuilder;
  forPost: (path: string) => TestRequestBuilder;
  stop: () => Promise<void>;
  urlFor: (path: string) => string;
};

class TestRequestBody {
  constructor(
    private readonly headers: IncomingHttpHeaders,
    readonly buffer: Buffer,
  ) {}

  async getMultipartFormData(): Promise<TestMultipartPart[] | undefined> {
    return parseMultipartFormData(this.headers["content-type"], this.buffer);
  }

  async getText(): Promise<string> {
    return this.buffer.toString("utf8");
  }
}

class TestEndpoint {
  private readonly seenRequests: TestSeenRequest[] = [];

  addSeenRequest(request: TestSeenRequest) {
    this.seenRequests.push(request);
  }

  async getSeenRequests(): Promise<TestSeenRequest[]> {
    return this.seenRequests;
  }
}

class TestRequestBuilder {
  constructor(
    private readonly routes: TestRoute[],
    private readonly method: string,
    private readonly path: string,
  ) {}

  thenCloseConnection(): TestEndpoint {
    return this.addRoute({
      type: "close",
    });
  }

  thenReply(status: number): TestEndpoint;
  thenReply(status: number, body: Buffer | string, headers?: TestResponseHeaders): TestEndpoint;
  thenReply(
    status: number,
    statusMessage: string,
    body: Buffer | string,
    headers?: TestResponseHeaders,
  ): TestEndpoint;
  thenReply(
    status: number,
    first?: Buffer | string,
    second?: Buffer | string | TestResponseHeaders,
    third?: TestResponseHeaders,
  ): TestEndpoint {
    const hasStatusMessage = typeof second === "string" || Buffer.isBuffer(second);
    const body = hasStatusMessage ? second : first;
    const headers = hasStatusMessage ? third : (second as TestResponseHeaders | undefined);

    return this.addRoute({
      body,
      headers: headers ?? {},
      status,
      type: "reply",
    });
  }

  thenStream(status: number, stream: Readable, headers: TestResponseHeaders = {}): TestEndpoint {
    return this.addRoute({
      headers,
      status,
      stream,
      type: "stream",
    });
  }

  thenTimeout(): TestEndpoint {
    return this.addRoute({
      type: "timeout",
    });
  }

  waitForRequestBody(): this {
    return this;
  }

  private addRoute(action: TestRouteAction): TestEndpoint {
    const endpoint = new TestEndpoint();

    this.routes.push({
      action,
      endpoint,
      method: this.method,
      path: this.path,
    });

    return endpoint;
  }
}

type TestRuntimeResult<T> = {
  messages: RuntimeMessage[];
  result: T;
};

type HttpTestResult<T> = {
  attachments: RuntimeAttachmentContentMessage[];
  exchanges: HttpExchange[];
  messages: RuntimeMessage[];
  result: T;
};

type GlobalRuntimeHolder = typeof globalThis & {
  allureTestRuntime?: () => unknown;
};

const createTestServer = async (): Promise<TestHttpServer> => {
  const routes: TestRoute[] = [];
  const sockets = new Set<Socket>();
  const server = createServer((request, response) => {
    handleTestRequest(request, response, routes).catch(() => {
      if (!response.headersSent) {
        response.statusCode = 500;
      }

      response.end();
    });
  });

  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => {
      sockets.delete(socket);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("failed to start local HTTP test server");
  }

  const origin = `http://127.0.0.1:${address.port}`;

  return {
    forGet: (path) => new TestRequestBuilder(routes, "GET", path),
    forPost: (path) => new TestRequestBuilder(routes, "POST", path),
    stop: async () => {
      for (const socket of sockets) {
        socket.destroy();
      }

      if (!server.listening) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
    urlFor: (path) => new URL(path, origin).toString(),
  };
};

const handleTestRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
  routes: TestRoute[],
): Promise<void> => {
  const route = routes.find(({ method, path }) => method === request.method && path === parseRequestPath(request.url));

  if (!route) {
    response.statusCode = 404;
    response.end();

    return;
  }

  if (route.action.type === "close") {
    request.socket.destroy();

    return;
  }

  if (route.action.type === "timeout") {
    return;
  }

  const bodyBuffer = await readIncomingBody(request);

  route.endpoint.addSeenRequest({
    body: new TestRequestBody(request.headers, bodyBuffer),
    headers: request.headers,
  });

  response.statusCode = route.action.status;

  for (const [name, value] of Object.entries(route.action.headers)) {
    response.setHeader(name, value);
  }

  if (route.action.type === "reply") {
    response.end(route.action.body);

    return;
  }

  route.action.stream.on("error", () => {
    response.destroy();
  });
  route.action.stream.pipe(response);
};

const parseRequestPath = (url: string | undefined): string => {
  return new URL(url ?? "/", "http://127.0.0.1").pathname;
};

const readIncomingBody = async (request: IncomingMessage): Promise<Buffer> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const parseMultipartFormData = (
  rawContentType: IncomingHttpHeaders["content-type"],
  buffer: Buffer,
): TestMultipartPart[] | undefined => {
  const contentType = Array.isArray(rawContentType) ? rawContentType[0] : rawContentType;
  const boundaryMatch = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];

  if (!boundary) {
    return undefined;
  }

  const parts: TestMultipartPart[] = [];
  const delimiter = `--${boundary}`;
  const rawParts = buffer.toString("binary").split(delimiter).slice(1);

  for (const rawPart of rawParts) {
    if (rawPart.startsWith("--")) {
      break;
    }

    const part = rawPart.replace(/^\r\n/, "");
    const headerEndIndex = part.indexOf("\r\n\r\n");

    if (headerEndIndex === -1) {
      continue;
    }

    const rawHeaders = part.slice(0, headerEndIndex).split("\r\n");
    const headers = new Map<string, string>();
    let data = part.slice(headerEndIndex + 4);

    if (data.endsWith("\r\n")) {
      data = data.slice(0, -2);
    }

    for (const rawHeader of rawHeaders) {
      const separatorIndex = rawHeader.indexOf(":");

      if (separatorIndex === -1) {
        continue;
      }

      headers.set(rawHeader.slice(0, separatorIndex).trim().toLowerCase(), rawHeader.slice(separatorIndex + 1).trim());
    }

    const disposition = headers.get("content-disposition") ?? "";

    parts.push({
      data: Buffer.from(data, "binary"),
      filename: getHeaderParameter(disposition, "filename"),
      name: getHeaderParameter(disposition, "name"),
      type: headers.get("content-type"),
    });
  }

  return parts;
};

const getHeaderParameter = (header: string, name: string): string | undefined => {
  return header.match(new RegExp(`${name}="([^"]*)"`, "i"))?.[1];
};

const withTestRuntime = async <T>(body: () => T | Promise<T>): Promise<TestRuntimeResult<T>> => {
  const runtimeHolder = globalThis as GlobalRuntimeHolder;
  const previousRuntime = runtimeHolder.allureTestRuntime;
  const runtime = new MessageHolderTestRuntime();

  setGlobalTestRuntime(runtime);

  try {
    const result = await body();

    return {
      messages: runtime.messages(),
      result,
    };
  } finally {
    if (previousRuntime) {
      runtimeHolder.allureTestRuntime = previousRuntime;
    } else {
      delete runtimeHolder.allureTestRuntime;
    }
  }
};

const getHttpExchangeAttachmentMessages = (messages: RuntimeMessage[]): RuntimeAttachmentContentMessage[] => {
  return messages.filter(
    (message): message is RuntimeAttachmentContentMessage => message.type === "attachment_content",
  );
};

const parseHttpExchangeAttachment = (message: RuntimeAttachmentContentMessage): HttpExchange => {
  expect(message.data).toEqual(
    expect.objectContaining({
      contentType: ALLURE_HTTP_EXCHANGE_CONTENT_TYPE,
      encoding: "base64",
      fileExtension: ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
      wrapInStep: true,
    }),
  );

  const content = Buffer.from(message.data.content, message.data.encoding).toString("utf8");
  const exchange = JSON.parse(content) as HttpExchange;

  expect(content).toBe(JSON.stringify(exchange));

  return exchange;
};

const runHttpTest = async <T>(
  body: (server: TestHttpServer, fetch: FetchLike) => T | Promise<T>,
  options: AllureFetchOptions = {},
): Promise<HttpTestResult<T>> => {
  const server = await createTestServer();

  try {
    const { messages, result } = await withTestRuntime(async () => {
      const fetchWithAllure = withAllure(globalThis.fetch.bind(globalThis), options);

      return body(server, fetchWithAllure);
    });
    const attachments = getHttpExchangeAttachmentMessages(messages);
    const exchanges = attachments.map(parseHttpExchangeAttachment);

    return {
      attachments,
      exchanges,
      messages,
      result,
    };
  } finally {
    await server.stop();
  }
};

const runFetchTest = async <T>(
  fetchImpl: FetchLike,
  body: (fetch: FetchLike) => T | Promise<T>,
  options: AllureFetchOptions = {},
): Promise<HttpTestResult<T>> => {
  const { messages, result } = await withTestRuntime(async () => {
    const fetchWithAllure = withAllure(fetchImpl, options);

    return body(fetchWithAllure);
  });
  const attachments = getHttpExchangeAttachmentMessages(messages);
  const exchanges = attachments.map(parseHttpExchangeAttachment);

  return {
    attachments,
    exchanges,
    messages,
    result,
  };
};

describe("allure-fetch", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("captures request and response metadata with default redaction", async () => {
    const { attachments, exchanges, result } = await runHttpTest(async (server, fetch) => {
      await server.forGet("/v1/orders/42").thenReply(200, JSON.stringify({ ok: true }), {
        "content-length": "11",
        "content-type": "application/json",
        "set-cookie": "rid=response; HttpOnly; Secure; SameSite=Lax",
      });

      const response = await fetch(server.urlFor("/v1/orders/42?dryRun=true&token=secret"), {
        headers: {
          authorization: "Bearer secret",
          cookie: "sid=abc; theme=dark",
        },
      });

      return response.json();
    });

    expect(result).toEqual({ ok: true });
    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.data.name).toBe("HTTP Exchange");
    expect(exchanges).toHaveLength(1);

    const exchange = exchanges[0]!;

    expect(exchange.schemaVersion).toBe(1);
    expect(exchange.request.method).toBe("GET");
    expect(exchange.request.url).toMatch(/\/v1\/orders\/42\?dryRun=true&token=secret$/);
    expect(exchange.request.headers).toEqual(
      expect.arrayContaining([
        { name: "authorization", value: ALLURE_HTTP_REDACTED_VALUE },
        { name: "cookie", value: ALLURE_HTTP_REDACTED_VALUE },
      ]),
    );
    expect(exchange.request.query).toEqual(
      expect.arrayContaining([
        { name: "dryRun", value: "true" },
        { name: "token", value: ALLURE_HTTP_REDACTED_VALUE },
      ]),
    );
    expect(exchange.request.cookies).toEqual([
      { name: "sid", value: ALLURE_HTTP_REDACTED_VALUE },
      { name: "theme", value: ALLURE_HTTP_REDACTED_VALUE },
    ]);
    expect(exchange.response?.status).toBe(200);
    expect(exchange.response?.headers).toEqual(
      expect.arrayContaining([
        { name: "content-length", value: "11" },
        { name: "content-type", value: "application/json" },
        { name: "set-cookie", value: ALLURE_HTTP_REDACTED_VALUE },
      ]),
    );
    expect(exchange.response?.cookies).toEqual([
      {
        httpOnly: true,
        name: "rid",
        sameSite: "Lax",
        secure: true,
        value: ALLURE_HTTP_REDACTED_VALUE,
      },
    ]);
    expect(exchange.response?.body).toMatchObject({
      contentType: "application/json",
      encoding: "utf8",
      size: 11,
      truncated: false,
      value: '{"ok":true}',
    });
  });

  it("captures request body without consuming the request or returned response", async () => {
    const { exchanges, result } = await runHttpTest(async (server, fetch) => {
      const endpoint = await server.forPost("/v1/orders").waitForRequestBody().thenReply(201, "Created", "accepted", {
        "content-length": "8",
        "content-type": "text/plain",
      });

      const response = await fetch(server.urlFor("/v1/orders"), {
        body: JSON.stringify({ name: "demo" }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const seenRequests = await endpoint.getSeenRequests();

      return {
        responseText: await response.text(),
        serverBody: await seenRequests[0]?.body.getText(),
      };
    });

    expect(result).toEqual({
      responseText: "accepted",
      serverBody: '{"name":"demo"}',
    });
    expect(exchanges[0]?.request.body).toMatchObject({
      contentType: "application/json",
      encoding: "utf8",
      truncated: false,
      value: '{"name":"demo"}',
    });
    expect(exchanges[0]?.response?.body).toMatchObject({
      contentType: "text/plain",
      encoding: "utf8",
      size: 8,
      truncated: false,
      value: "accepted",
    });
  });

  it("redacts URL-encoded form values in both raw value and structured fields", async () => {
    const { exchanges } = await runHttpTest(async (server, fetch) => {
      await server.forPost("/login").waitForRequestBody().thenReply(204);

      await fetch(server.urlFor("/login"), {
        body: new URLSearchParams({
          password: "secret",
          username: "demo",
        }),
        method: "POST",
      });
    });

    expect(exchanges[0]?.request.body).toMatchObject({
      contentType: "application/x-www-form-urlencoded;charset=UTF-8",
      encoding: "utf8",
      form: [
        { name: "password", value: ALLURE_HTTP_REDACTED_VALUE },
        { name: "username", value: "demo" },
      ],
      truncated: false,
      value: `password=${ALLURE_HTTP_REDACTED_VALUE}&username=demo`,
    });
  });

  it("captures binary responses as base64 and marks truncated bodies", async () => {
    const { exchanges, result } = await runHttpTest(
      async (server, fetch) => {
        await server.forGet("/file.bin").thenReply(200, Buffer.from([0, 1, 2, 3]), {
          "content-length": "4",
          "content-type": "application/octet-stream",
        });

        const response = await fetch(server.urlFor("/file.bin"));

        return [...new Uint8Array(await response.arrayBuffer())];
      },
      {
        maxBodySize: 3,
      },
    );

    expect(result).toEqual([0, 1, 2, 3]);
    expect(exchanges[0]?.response?.body).toEqual({
      contentType: "application/octet-stream",
      encoding: "base64",
      size: 4,
      stream: {
        chunkCount: 1,
        complete: false,
        type: "chunked",
      },
      truncated: true,
      value: Buffer.from([0, 1, 2]).toString("base64"),
    });
  });

  it("attaches transport errors and rethrows the original error", async () => {
    const { exchanges, result } = await runHttpTest(async (server, fetch) => {
      await server.forGet("/unreachable").thenCloseConnection();

      try {
        await fetch(server.urlFor("/unreachable"));
      } catch (err) {
        return err;
      }

      throw new Error("expected fetch to fail");
    });

    expect(exchanges).toHaveLength(1);
    expect(result).toBeInstanceOf(TypeError);
    expect(exchanges[0]).toMatchObject({
      error: {
        name: "TypeError",
      },
      request: {
        method: "GET",
      },
    });
    expect(exchanges[0]?.request.url).toMatch(/\/unreachable$/);
    expect(exchanges[0]?.response).toBeUndefined();
  });

  it("attaches abort errors and rethrows the original abort", async () => {
    const { exchanges, result } = await runHttpTest(async (server, fetch) => {
      await server.forGet("/slow").thenTimeout();

      const controller = new AbortController();
      const fetchPromise = fetch(server.urlFor("/slow"), {
        signal: controller.signal,
      });

      controller.abort();

      try {
        await fetchPromise;
      } catch (err) {
        return err;
      }

      throw new Error("expected fetch to abort");
    });

    expect(exchanges).toHaveLength(1);
    expect(result).toBeInstanceOf(DOMException);
    expect(exchanges[0]).toMatchObject({
      error: {
        name: "AbortError",
      },
      request: {
        method: "GET",
      },
    });
    expect(exchanges[0]?.response).toBeUndefined();
  });

  it("captures text response truncation without consuming the returned response", async () => {
    const { exchanges, result } = await runHttpTest(
      async (server, fetch) => {
        await server.forGet("/long-text").thenReply(200, "hello world", {
          "content-length": "11",
          "content-type": "text/plain",
        });

        const response = await fetch(server.urlFor("/long-text"));

        return response.text();
      },
      {
        maxBodySize: 5,
      },
    );

    expect(result).toBe("hello world");
    expect(exchanges[0]?.response?.body).toEqual({
      contentType: "text/plain",
      encoding: "utf8",
      size: 11,
      stream: {
        chunkCount: 1,
        complete: false,
        type: "chunked",
      },
      truncated: true,
      value: "hello",
    });
  });

  it("captures binary request bodies as base64", async () => {
    const { exchanges, result } = await runHttpTest(async (server, fetch) => {
      const endpoint = await server.forPost("/binary").waitForRequestBody().thenReply(204);
      const body = Buffer.from([0, 1, 2, 3]);
      const response = await fetch(server.urlFor("/binary"), {
        body,
        headers: {
          "content-type": "application/octet-stream",
        },
        method: "POST",
      });
      const seenRequests = await endpoint.getSeenRequests();

      return {
        serverBody: [...(seenRequests[0]?.body.buffer ?? [])],
        status: response.status,
      };
    });

    expect(result).toEqual({
      serverBody: [0, 1, 2, 3],
      status: 204,
    });
    expect(exchanges[0]?.request.body).toEqual({
      contentType: "application/octet-stream",
      encoding: "base64",
      size: 4,
      truncated: false,
      value: Buffer.from([0, 1, 2, 3]).toString("base64"),
    });
  });

  it("captures truncated request bodies without consuming the sent request", async () => {
    const { exchanges, result } = await runHttpTest(
      async (server, fetch) => {
        const endpoint = await server.forPost("/long-request").waitForRequestBody().thenReply(200, "ok");
        const response = await fetch(server.urlFor("/long-request"), {
          body: "hello world",
          headers: {
            "content-type": "text/plain",
          },
          method: "POST",
        });
        const seenRequests = await endpoint.getSeenRequests();

        return {
          responseText: await response.text(),
          serverBody: await seenRequests[0]?.body.getText(),
        };
      },
      {
        maxBodySize: 5,
      },
    );

    expect(result).toEqual({
      responseText: "ok",
      serverBody: "hello world",
    });
    expect(exchanges[0]?.request.body).toEqual({
      contentType: "text/plain",
      encoding: "utf8",
      stream: {
        chunkCount: 1,
        complete: false,
        type: "chunked",
      },
      truncated: true,
      value: "hello",
    });
  });

  it("captures multipart form-data fields and file parts", async () => {
    const { exchanges, result } = await runHttpTest(async (server, fetch) => {
      const endpoint = await server.forPost("/upload").waitForRequestBody().thenReply(202, "accepted");
      const formData = new FormData();

      formData.append("title", "quarterly report");
      formData.append("password", "secret");
      formData.append(
        "file",
        new Blob([Buffer.from([0, 1, 2])], {
          type: "application/octet-stream",
        }),
        "report.bin",
      );

      const response = await fetch(server.urlFor("/upload"), {
        body: formData,
        method: "POST",
      });
      const seenRequests = await endpoint.getSeenRequests();

      return {
        responseText: await response.text(),
        serverParts: await seenRequests[0]?.body.getMultipartFormData(),
      };
    });

    expect(result.responseText).toBe("accepted");
    expect(result.serverParts?.map((part) => part.name)).toEqual(["title", "password", "file"]);
    expect(exchanges[0]?.request.body).toEqual(
      expect.objectContaining({
        contentType: expect.stringMatching(/^multipart\/form-data; boundary=/),
        parts: expect.arrayContaining([
          {
            encoding: "utf8",
            name: "title",
            size: 16,
            truncated: false,
            value: "quarterly report",
          },
          {
            encoding: "utf8",
            name: "password",
            size: ALLURE_HTTP_REDACTED_VALUE.length,
            truncated: false,
            value: ALLURE_HTTP_REDACTED_VALUE,
          },
          {
            contentType: "application/octet-stream",
            fileName: "report.bin",
            name: "file",
            size: 3,
            truncated: false,
          },
        ]),
        truncated: false,
      }),
    );
  });

  it("marks truncated event-stream responses as server-sent-events streams", async () => {
    const { exchanges, result } = await runHttpTest(
      async (server, fetch) => {
        await server.forGet("/events").thenStream(200, Readable.from(["data: one\n\n", "data: two\n\n"]), {
          "content-type": "text/event-stream",
        });

        const response = await fetch(server.urlFor("/events"));

        return response.text();
      },
      {
        maxBodySize: 7,
      },
    );

    expect(result).toBe("data: one\n\ndata: two\n\n");
    expect(exchanges[0]?.response?.body).toMatchObject({
      contentType: "text/event-stream",
      encoding: "utf8",
      stream: {
        complete: false,
        type: "server-sent-events",
      },
      truncated: true,
      value: "data: o",
    });
    expect(exchanges[0]?.response?.body?.stream?.chunkCount).toBeGreaterThanOrEqual(1);
  });

  it("marks truncated gRPC responses as grpc streams", async () => {
    const { exchanges, result } = await runHttpTest(
      async (server, fetch) => {
        await server.forGet("/grpc").thenReply(200, Buffer.from([0, 0, 0, 0, 1, 42]), {
          "content-length": "6",
          "content-type": "application/grpc",
        });

        const response = await fetch(server.urlFor("/grpc"));

        return [...new Uint8Array(await response.arrayBuffer())];
      },
      {
        maxBodySize: 3,
      },
    );

    expect(result).toEqual([0, 0, 0, 0, 1, 42]);
    expect(exchanges[0]?.response?.body).toEqual({
      contentType: "application/grpc",
      encoding: "base64",
      size: 6,
      stream: {
        chunkCount: 1,
        complete: false,
        type: "grpc",
      },
      truncated: true,
      value: Buffer.from([0, 0, 0]).toString("base64"),
    });
  });

  it("applies custom redaction matchers", async () => {
    const { exchanges } = await runHttpTest(
      async (server, fetch) => {
        await server.forGet("/custom-redaction").thenReply(200, "ok", {
          "content-type": "text/plain",
        });

        await fetch(server.urlFor("/custom-redaction?public=ok&private=secret"), {
          headers: {
            "x-redact-me": "secret-header",
          },
        });
      },
      {
        redactHeaders: [(name) => name === "x-redact-me"],
        redactQueryParams: [(name, value) => name === "private" && value === "secret"],
      },
    );

    expect(exchanges[0]?.request.headers).toEqual(
      expect.arrayContaining([{ name: "x-redact-me", value: ALLURE_HTTP_REDACTED_VALUE }]),
    );
    expect(exchanges[0]?.request.query).toEqual(
      expect.arrayContaining([
        { name: "public", value: "ok" },
        { name: "private", value: ALLURE_HTTP_REDACTED_VALUE },
      ]),
    );
  });

  it("can disable request and response body capture", async () => {
    const { exchanges, result } = await runHttpTest(
      async (server, fetch) => {
        const endpoint = await server.forPost("/body-disabled").waitForRequestBody().thenReply(200, "response body");
        const response = await fetch(server.urlFor("/body-disabled"), {
          body: "request body",
          headers: {
            "content-type": "text/plain",
          },
          method: "POST",
        });
        const seenRequests = await endpoint.getSeenRequests();

        return {
          responseText: await response.text(),
          serverBody: await seenRequests[0]?.body.getText(),
        };
      },
      {
        captureRequestBody: false,
        captureResponseBody: false,
      },
    );

    expect(result).toEqual({
      responseText: "response body",
      serverBody: "request body",
    });
    expect(exchanges[0]?.request.body).toBeUndefined();
    expect(exchanges[0]?.response?.body).toBeUndefined();
  });

  it("includes error stacks when configured", async () => {
    const originalError = new Error("network failed");
    originalError.name = "NetworkError";

    const { exchanges, result } = await runFetchTest(
      async () => {
        throw originalError;
      },
      async (fetch) => {
        try {
          await fetch("https://api.example.com/failure");
        } catch (err) {
          return err;
        }

        throw new Error("expected fetch to fail");
      },
      {
        includeErrorStack: true,
      },
    );

    expect(result).toBe(originalError);
    expect(exchanges[0]?.error).toEqual({
      message: "network failed",
      name: "NetworkError",
      stack: originalError.stack,
    });
  });

  it("throws attachment errors on successful exchanges when configured", async () => {
    class FailingAttachmentRuntime extends MessageHolderTestRuntime {
      override async sendMessage(_message: RuntimeMessage): Promise<void> {
        throw new Error("attachment failed");
      }
    }

    const runtimeHolder = globalThis as GlobalRuntimeHolder;
    const previousRuntime = runtimeHolder.allureTestRuntime;

    setGlobalTestRuntime(new FailingAttachmentRuntime());

    try {
      const fetchWithAllure = withAllure(async () => new Response("ok"), {
        throwAttachmentErrors: true,
      });

      await expect(fetchWithAllure("https://api.example.com/ping")).rejects.toThrow("attachment failed");
    } finally {
      if (previousRuntime) {
        runtimeHolder.allureTestRuntime = previousRuntime;
      } else {
        delete runtimeHolder.allureTestRuntime;
      }
    }
  });

  it("attaches response body stream errors", async () => {
    const body = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(Buffer.from("partial"));
        controller.error(new Error("response body interrupted"));
      },
    });
    const { exchanges, result } = await runFetchTest(
      async () =>
        new Response(body, {
          headers: {
            "content-type": "text/plain",
          },
        }),
      async (fetch) => {
        try {
          await fetch("https://api.example.com/interrupted");
        } catch (err) {
          return err;
        }

        throw new Error("expected fetch to fail");
      },
    );

    expect(result).toBeInstanceOf(Error);
    expect(exchanges[0]).toMatchObject({
      error: {
        message: "response body interrupted",
        name: "Error",
      },
      request: {
        method: "GET",
        url: "https://api.example.com/interrupted",
      },
    });
    expect(exchanges[0]?.response).toBeUndefined();
  });

  it("uses custom attachment names in runtime messages", async () => {
    const { messages } = await withTestRuntime(async () => {
      const fetchWithAllure = withAllure(async () => new Response("ok"), {
        attachmentName: (exchange) => `${exchange.request.method} ${new URL(exchange.request.url).pathname}`,
      });

      await fetchWithAllure("https://api.example.com/v1/orders");
    });
    const attachments = getHttpExchangeAttachmentMessages(messages);

    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.data).toEqual(
      expect.objectContaining({
        contentType: ALLURE_HTTP_EXCHANGE_CONTENT_TYPE,
        fileExtension: ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
        name: "GET /v1/orders",
      }),
    );
    expect(parseHttpExchangeAttachment(attachments[0]!).request.url).toBe("https://api.example.com/v1/orders");
  });

  it("can instrument and restore global fetch", async () => {
    const fetchImpl: FetchLike = async () => new Response("ok");

    globalThis.fetch = fetchImpl as typeof globalThis.fetch;

    const { messages } = await withTestRuntime(async () => {
      const restore = instrumentGlobalFetch();

      try {
        const response = await fetch("https://api.example.com/ping");

        expect(await response.text()).toBe("ok");
      } finally {
        restore();
      }
    });
    const exchanges = getHttpExchangeAttachmentMessages(messages).map(parseHttpExchangeAttachment);

    expect(exchanges[0]?.request.url).toBe("https://api.example.com/ping");
    expect(globalThis.fetch).toBe(fetchImpl);
  });
});
