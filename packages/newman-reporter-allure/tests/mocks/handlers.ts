// src/mocks/handlers.js
import { rest } from "msw";

export const handlers = [
  rest.get("http://example.com/", (req, res, ctx) => {
    return res(ctx.status(205));
  }),
];
