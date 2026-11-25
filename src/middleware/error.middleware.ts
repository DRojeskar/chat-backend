import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";



import { HttpError } from "../types";

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }






  

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error("Unhandled request error:", error);
  response.status(500).json({ error: "Internal server error" });
};
