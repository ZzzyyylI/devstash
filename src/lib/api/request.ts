import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/** Returned by {@link readJsonBody} when the request body isn't valid JSON. */
export const INVALID_JSON = Symbol("invalid-json");

/**
 * Parse a request's JSON body. Never throws — returns {@link INVALID_JSON} when
 * the body is missing or malformed (pair with {@link invalidJsonResponse}).
 */
export async function readJsonBody(
  request: Request,
): Promise<unknown | typeof INVALID_JSON> {
  try {
    return await request.json();
  } catch {
    return INVALID_JSON;
  }
}

/** The standard `400` for an unparseable request body. */
export function invalidJsonResponse(): NextResponse {
  return NextResponse.json(
    { success: false, error: "Invalid JSON body" },
    { status: 400 },
  );
}

/**
 * The standard `400` for a Zod validation failure:
 * `{ success: false, error, details? }`. `details` (per-field messages from
 * `error.flatten().fieldErrors`) is included unless `includeDetails` is `false`
 * — the email-only endpoints omit it since their forms don't render field errors.
 */
export function validationErrorResponse(
  error: ZodError,
  message: string,
  includeDetails = true,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(includeDetails
        ? { details: error.flatten().fieldErrors }
        : {}),
    },
    { status: 400 },
  );
}
