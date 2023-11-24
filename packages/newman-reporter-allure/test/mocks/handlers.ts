import { rest } from "msw";

export const handlers = [
  rest.get("http://example.com/test", (req, res, ctx) => {
    return res(ctx.status(200));
  }),
  rest.get("http://example.com/timeout", (req, res, ctx) => {
    return res.networkError("Timeout");
  }),
];
