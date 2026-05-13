import { createServer, type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from "node:http";
import type { Socket } from "node:net";

import axios, { type AxiosInstance, type AxiosResponse, AxiosError } from "axios";
import {
  ALLURE_HTTP_EXCHANGE_CONTENT_TYPE,
  ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
  ALLURE_HTTP_REDACTED_VALUE,
  type HttpExchange,
} from "allure-js-commons";
import type { RuntimeAttachmentContentMessage, RuntimeMessage } from "allure-js-commons/sdk";
import { MessageHolderTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { describe, expect, it } from "vitest";

import { type AllureAxiosOptions, instrumentAxios } from "../../src/index.js";

type TestResponseHeaders = Record<string, number | readonly string[] | string>;

type TestRouteAction =
  | {
      body?: Buffer | string;
      headers: TestResponseHeaders;
      status: number;
      type: "reply";
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
  constructor(readonly buffer: Buffer) {}

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

  thenReply(status: number, body: Buffer | string = "", headers: TestResponseHeaders = {}): TestEndpoint {
    return this.addRoute({
      body,
      headers,
      status,
      type: "reply",
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
    body: new TestRequestBody(bodyBuffer),
    headers: request.headers,
  });

  response.statusCode = route.action.status;

  for (const [name, value] of Object.entries(route.action.headers)) {
    response.setHeader(name, value);
  }

  response.end(route.action.body);
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

const runAxiosTest = async <T>(
  body: (server: TestHttpServer, client: AxiosInstance) => T | Promise<T>,
  options: AllureAxiosOptions = {},
): Promise<HttpTestResult<T>> => {
  const server = await createTestServer();

  try {
    const { messages, result } = await withTestRuntime(async () => {
      const client = axios.create();
      const restore = instrumentAxios(client, options);

      try {
        return await body(server, client);
      } finally {
        restore();
      }
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

describe("allure-axios", () => {
  it("captures request and response metadata with default redaction", async () => {
    const { attachments, exchanges, result } = await runAxiosTest(async (server, client) => {
      await server.forGet("/v1/orders/42").thenReply(200, JSON.stringify({ ok: true }), {
        "content-length": "11",
        "content-type": "application/json",
        "set-cookie": "rid=response; HttpOnly; Secure; SameSite=Lax",
      });

      const response = await client.get(server.urlFor("/v1/orders/42?dryRun=true&token=secret"), {
        headers: {
          authorization: "Bearer secret",
          cookie: "sid=abc; theme=dark",
        },
      });

      return response.data;
    });

    expect(result).toEqual({ ok: true });
    expect(attachments).toHaveLength(1);
    expect(attachments[0]?.data.name).toMatch(/GET http:\/\/127\.0\.0\.1:\d+\/v1\/orders\/42\?dryRun=true&token=secret$/);
    expect(attachments[0]?.data.wrapInStep).toBe(true);
    expect(exchanges).toHaveLength(1);

    const exchange = exchanges[0]!;

    expect(exchange.schemaVersion).toBe(1);
    expect(exchange.start).toEqual(expect.any(Number));
    expect(exchange.stop).toEqual(expect.any(Number));
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

  it("captures request body after Axios transforms it", async () => {
    const { exchanges, result } = await runAxiosTest(async (server, client) => {
      const endpoint = await server.forPost("/v1/orders").waitForRequestBody().thenReply(201, "accepted", {
        "content-length": "8",
        "content-type": "text/plain",
      });

      const response = await client.post(
        server.urlFor("/v1/orders"),
        {
          name: "demo",
        },
        {
          headers: {
            "content-type": "application/json",
          },
        },
      );
      const seenRequests = await endpoint.getSeenRequests();

      return {
        responseText: response.data,
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
    const { exchanges } = await runAxiosTest(async (server, client) => {
      await server.forPost("/login").waitForRequestBody().thenReply(204);

      await client.post(
        server.urlFor("/login"),
        new URLSearchParams({
          password: "secret",
          username: "demo",
        }),
      );
    });

    expect(exchanges[0]?.request.body).toMatchObject({
      contentType: "application/x-www-form-urlencoded;charset=utf-8",
      encoding: "utf8",
      form: [
        { name: "password", value: ALLURE_HTTP_REDACTED_VALUE },
        { name: "username", value: "demo" },
      ],
      truncated: false,
      value: `password=${ALLURE_HTTP_REDACTED_VALUE}&username=demo`,
    });
  });

  it("captures binary request and response bodies as base64 and marks truncation", async () => {
    const { exchanges, result } = await runAxiosTest(
      async (server, client) => {
        const endpoint = await server.forPost("/binary").waitForRequestBody().thenReply(200, Buffer.from([4, 5, 6, 7]), {
          "content-length": "4",
          "content-type": "application/octet-stream",
        });

        const response = await client.post(server.urlFor("/binary"), Buffer.from([0, 1, 2, 3]), {
          headers: {
            "content-type": "application/octet-stream",
          },
          responseType: "arraybuffer",
        });
        const seenRequests = await endpoint.getSeenRequests();

        return {
          responseBody: [...new Uint8Array(response.data)],
          serverBody: [...(seenRequests[0]?.body.buffer ?? [])],
        };
      },
      {
        maxBodySize: 3,
      },
    );

    expect(result).toEqual({
      responseBody: [4, 5, 6, 7],
      serverBody: [0, 1, 2, 3],
    });
    expect(exchanges[0]?.request.body).toEqual({
      contentType: "application/octet-stream",
      encoding: "base64",
      size: 4,
      truncated: true,
      value: Buffer.from([0, 1, 2]).toString("base64"),
    });
    expect(exchanges[0]?.response?.body).toEqual({
      contentType: "application/octet-stream",
      encoding: "base64",
      size: 4,
      truncated: true,
      value: Buffer.from([4, 5, 6]).toString("base64"),
    });
  });

  it("captures rejected HTTP status responses and preserves the original AxiosError", async () => {
    const { exchanges, result } = await runAxiosTest(async (server, client) => {
      await server.forGet("/teapot").thenReply(418, JSON.stringify({ error: true }), {
        "content-length": "14",
        "content-type": "application/json",
      });

      try {
        await client.get(server.urlFor("/teapot"));
      } catch (err) {
        return err;
      }

      throw new Error("expected Axios to reject 418 response");
    });

    expect(result).toBeInstanceOf(AxiosError);
    expect((result as AxiosError).response?.status).toBe(418);
    expect(exchanges).toHaveLength(1);
    expect(exchanges[0]).toMatchObject({
      error: {
        message: "Request failed with status code 418",
        name: "AxiosError",
      },
      request: {
        method: "GET",
      },
      response: {
        status: 418,
        body: {
          contentType: "application/json",
          encoding: "utf8",
          value: '{"error":true}',
        },
      },
    });
  });

  it("attaches transport errors and rethrows the original error", async () => {
    const { exchanges, result } = await runAxiosTest(async (server, client) => {
      await server.forGet("/unreachable").thenCloseConnection();

      try {
        await client.get(server.urlFor("/unreachable"));
      } catch (err) {
        return err;
      }

      throw new Error("expected Axios to fail");
    });

    expect(result).toBeInstanceOf(Error);
    expect(exchanges).toHaveLength(1);
    expect(exchanges[0]).toMatchObject({
      error: {
        message: expect.any(String),
      },
      request: {
        method: "GET",
      },
    });
    expect(exchanges[0]?.request.url).toMatch(/\/unreachable$/);
    expect(exchanges[0]?.response).toBeUndefined();
  });

  it("attaches cancel errors and rethrows the original cancellation", async () => {
    const { exchanges, result } = await runAxiosTest(async (server, client) => {
      await server.forGet("/slow").thenTimeout();

      const controller = new AbortController();
      const requestPromise = client.get(server.urlFor("/slow"), {
        signal: controller.signal,
      });

      controller.abort();

      try {
        await requestPromise;
      } catch (err) {
        return err;
      }

      throw new Error("expected Axios to cancel");
    });

    expect(axios.isCancel(result)).toBe(true);
    expect(exchanges).toHaveLength(1);
    expect(exchanges[0]).toMatchObject({
      error: {
        name: "CanceledError",
      },
      request: {
        method: "GET",
      },
    });
    expect(exchanges[0]?.response).toBeUndefined();
  });

  it("applies custom redaction matchers and custom attachment names", async () => {
    const { attachments, exchanges } = await runAxiosTest(
      async (server, client) => {
        await server.forGet("/custom-redaction").thenReply(200, "ok", {
          "content-type": "text/plain",
        });

        await client.get(server.urlFor("/custom-redaction?public=ok&private=secret"), {
          headers: {
            "x-redact-me": "secret-header",
          },
        });
      },
      {
        attachmentName: (exchange) => `${exchange.request.method} ${new URL(exchange.request.url).pathname}`,
        redactHeaders: [(name) => name === "x-redact-me"],
        redactQueryParams: [(name, value) => name === "private" && value === "secret"],
      },
    );

    expect(attachments[0]?.data.name).toBe("GET /custom-redaction");
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
    const { exchanges, result } = await runAxiosTest(
      async (server, client) => {
        const endpoint = await server.forPost("/body-disabled").waitForRequestBody().thenReply(200, "response body");
        const response = await client.post(server.urlFor("/body-disabled"), "request body", {
          headers: {
            "content-type": "text/plain",
          },
        });
        const seenRequests = await endpoint.getSeenRequests();

        return {
          responseText: response.data,
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

  it("ejects installed interceptors when restored", async () => {
    const { messages } = await withTestRuntime(async () => {
      const client = axios.create({
        adapter: async (config): Promise<AxiosResponse> => ({
          config,
          data: "ok",
          headers: {},
          request: {},
          status: 200,
          statusText: "OK",
        }),
      });
      const restore = instrumentAxios(client);

      restore();
      await client.get("https://api.example.com/ping");
    });

    expect(getHttpExchangeAttachmentMessages(messages)).toHaveLength(0);
  });
});
