# Allure Axios

Allure Axios records Axios HTTP exchanges as structured Allure attachments using the Allure HTTP Exchange v1 format.

Each captured request creates one attachment:

- name: `${exchange.request.method} ${exchange.request.url}`
- MIME type: `application/vnd.allure.http+json`
- extension: `.httpexchange`

The Allure runtime wraps the attachment in a step with the same name so it is displayed at the request point in the current test or step.

## Install

```bash
npm install -D allure-axios allure-js-commons axios
```

## Instrument An Axios Instance

```ts
import axios from "axios";
import { instrumentAxios } from "allure-axios";

const client = axios.create({
  baseURL: "https://api.example.com",
});

const restoreAxios = instrumentAxios(client);

try {
  await client.post("/orders", {
    sku: "ABC-123",
  });
} finally {
  restoreAxios();
}
```

## Redaction

Values for sensitive headers, query parameters, cookies, and URL-encoded form fields are redacted before the attachment is written. Redacted values use the v1 sentinel `__ALLURE_REDACTED__`.

```ts
const restoreAxios = instrumentAxios(client, {
  redactHeaders: [/^authorization$/i, /^x-api-key$/i],
  redactQueryParams: [/token/i],
  redactCookies: [/.*/],
  redactFormFields: [/password/i],
});
```

By default, `authorization`, `cookie`, `set-cookie`, token-like, password-like, secret-like, API-key-like values, and all cookie values are redacted.

## Body Capture

Axios request bodies are captured after Axios applies request transforms. Text bodies are stored as UTF-8 strings; binary bodies are stored as base64. Captured bodies are bounded by `maxBodySize`, which defaults to 64 KiB. Stream and multipart payloads are summarized without consuming them.
