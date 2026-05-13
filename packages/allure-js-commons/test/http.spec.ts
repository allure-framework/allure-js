import { describe, expect, it } from "vitest";

import {
  ALLURE_HTTP_EXCHANGE_CONTENT_TYPE,
  ALLURE_HTTP_EXCHANGE_FILE_EXTENSION,
  ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION,
  ALLURE_HTTP_REDACTED_VALUE,
  ContentType,
  type HttpExchange,
} from "../src/index.js";

describe("HTTP exchange format exports", () => {
  it("exports v1 constants and a typed minimum payload", () => {
    const exchange: HttpExchange = {
      schemaVersion: ALLURE_HTTP_EXCHANGE_SCHEMA_VERSION,
      request: {
        method: "GET",
        url: "https://api.example.com/v1/orders/42",
      },
    };

    expect(exchange.schemaVersion).toBe(1);
    expect(ALLURE_HTTP_EXCHANGE_CONTENT_TYPE).toBe("application/vnd.allure.http+json");
    expect(ContentType.HTTP_EXCHANGE).toBe(ALLURE_HTTP_EXCHANGE_CONTENT_TYPE);
    expect(ALLURE_HTTP_EXCHANGE_FILE_EXTENSION).toBe(".httpexchange");
    expect(ALLURE_HTTP_REDACTED_VALUE).toBe("__ALLURE_REDACTED__");
  });
});
