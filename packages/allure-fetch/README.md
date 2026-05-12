# Allure Fetch

Allure Fetch records `fetch` HTTP exchanges as structured Allure attachments using the Allure HTTP Exchange v1 format.

Each captured request creates one attachment:

- name: `HTTP Exchange`
- MIME type: `application/vnd.allure.http+json`
- extension: `.httpexchange`

## Install

```bash
npm install -D allure-fetch allure-js-commons
```

## Create A Wrapped Fetch

```ts
import { withAllure } from "allure-fetch";

const fetchWithAllure = withAllure(fetch);

const response = await fetchWithAllure("https://api.example.com/orders", {
  method: "POST",
  headers: {
    "authorization": `Bearer ${token}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ sku: "ABC-123" }),
});
```

## Wrap A Custom Fetch Implementation

```ts
import { withAllure } from "allure-fetch";

const fetchWithAllure = withAllure(myFetch, {
  maxBodySize: 128 * 1024,
});

await fetchWithAllure("https://api.example.com/orders/42");
```

## Instrument Global Fetch

```ts
import { instrumentGlobalFetch } from "allure-fetch";

const restoreFetch = instrumentGlobalFetch();

try {
  await fetch("https://api.example.com/orders/42");
} finally {
  restoreFetch();
}
```

## Redaction

Values for sensitive headers, query parameters, cookies, and URL-encoded form fields are redacted before the attachment is written. Redacted values use the v1 sentinel `__ALLURE_REDACTED__`.

```ts
const fetchWithAllure = withAllure(fetch, {
  redactHeaders: [/^authorization$/i, /^x-api-key$/i],
  redactQueryParams: [/token/i],
  redactCookies: [/.*/],
  redactFormFields: [/password/i],
});
```

By default, `authorization`, `cookie`, `set-cookie`, token-like, password-like, secret-like, API-key-like values, and all cookie values are redacted.

## Body Capture

Request and response bodies are captured from cloned `Request` and `Response` objects, so the returned response remains readable by test code. Text bodies are stored as UTF-8 strings; binary bodies are stored as base64. Captured bodies are bounded by `maxBodySize`, which defaults to 64 KiB.
