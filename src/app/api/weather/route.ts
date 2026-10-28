import { z } from "zod";

import { ApiError, errorResponse } from "@/lib/api/http";
import { getWeather } from "@/lib/api/weather";

const coordinate = z
  .string()
  .trim()
  .min(1)
  .transform(Number)
  .pipe(z.number().finite());
const querySchema = z
  .object({
    latitude: coordinate.pipe(z.number().min(-90).max(90)),
    longitude: coordinate.pipe(z.number().min(-180).max(180)),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if (
      [...params.keys()].some((k) => !["latitude", "longitude"].includes(k)) ||
      params.getAll("latitude").length !== 1 ||
      params.getAll("longitude").length !== 1
    )
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Provide exactly one latitude and longitude",
      );
    const parsed = querySchema.safeParse(Object.fromEntries(params));
    if (!parsed.success)
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Latitude and longitude must be valid coordinates",
      );
    return Response.json(
      { data: await getWeather(parsed.data.latitude, parsed.data.longitude) },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=1800" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
