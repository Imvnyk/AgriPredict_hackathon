import { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > 65536)
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 65536)
      throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    body = JSON.parse(text);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success)
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      result.error.issues
        .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
        .join("; "),
    );
  return result.data;
}
export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError)
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error("API request failed", error);
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
