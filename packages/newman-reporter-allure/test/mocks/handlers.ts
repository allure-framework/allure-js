import { rest } from "msw";

export const handlers = [
  rest.get("http://example.com/test", (req, res, ctx) => {
    return res(ctx.status(200));
  }),

  rest.get("http://example.com/headers", (req, res, ctx) => {
    return res(
      ctx.set("Content-Type", "text/plain"),
      ctx.set("A-RESPONSE-HEADER", "With A VALUE"),
      ctx.set("B-RESPONSE-HEADER", "With Another VALUE"),
      ctx.json({
        message: "Mocked response JSON body",
      }),
      ctx.status(200),
    );
  }),

  rest.get("http://example.com/timeout", (req, res, ctx) => {
    return res.networkError("Timeout");
  }),
];
