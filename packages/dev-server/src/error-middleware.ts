import { ErrorCode, logError } from "@stdout-design/core";
import type { ErrorHandler } from "hono";

export const errorHandler: ErrorHandler = (err, c) => {
  logError(ErrorCode.INTERNAL_ERROR, "Unhandled server error", {
    error: err.message,
    method: c.req.method,
    path: c.req.path,
    stack: err.stack,
  });

  return c.json({ error: "Internal server error" }, 500);
};
