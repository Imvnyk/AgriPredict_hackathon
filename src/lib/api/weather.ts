import { z } from "zod";

import { ApiError } from "./http";
import { forecastSchema } from "./schema";

const numbers = z.array(z.number().finite().nullable()).length(7);
const providerSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  daily: z.object({
    time: z.array(z.iso.date()).length(7),
    temperature_2m_min: numbers,
    temperature_2m_max: numbers,
    rain_sum: numbers,
    wind_speed_10m_max: numbers,
    et0_fao_evapotranspiration: numbers,
  }),
  hourly: z.object({
    time: z.array(z.string()),
    relative_humidity_2m: z.array(
      z.number().finite().min(0).max(100).nullable(),
    ),
  }),
});
export async function getWeather(latitude: number, longitude: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily:
      "temperature_2m_min,temperature_2m_max,rain_sum,wind_speed_10m_max,et0_fao_evapotranspiration",
    hourly: "relative_humidity_2m",
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  }).toString();
  let response: Response;
  try {
    response = await fetch(url, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ApiError(
      502,
      "WEATHER_UNAVAILABLE",
      "Weather provider could not be reached",
    );
  }
  if (!response.ok)
    throw new ApiError(
      502,
      "WEATHER_UNAVAILABLE",
      "Weather provider returned an error",
    );
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ApiError(
      502,
      "WEATHER_INVALID",
      "Weather provider returned invalid data",
    );
  }
  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success)
    throw new ApiError(
      502,
      "WEATHER_INVALID",
      "Weather provider returned incomplete data",
    );
  const { daily, hourly, ...location } = parsed.data;
  if (hourly.time.length !== hourly.relative_humidity_2m.length)
    throw new ApiError(
      502,
      "WEATHER_INVALID",
      "Weather provider returned incomplete humidity data",
    );
  const humidityForDay = (date: string) => {
    const readings = hourly.time.flatMap((time, i) =>
      time.startsWith(`${date}T`) ? [hourly.relative_humidity_2m[i]] : [],
    );
    if (
      readings.length < 23 ||
      readings.length > 25 ||
      readings.some((value) => value === null)
    )
      return null;
    return (
      Math.round(
        ((readings as number[]).reduce((sum, value) => sum + value, 0) /
          readings.length) *
          10,
      ) / 10
    );
  };
  const days = forecastSchema.safeParse(
    daily.time.map((date, i) => ({
      date,
      temperatureMinC: daily.temperature_2m_min[i],
      temperatureMaxC: daily.temperature_2m_max[i],
      rainfallMm: daily.rain_sum[i],
      humidityMeanPercent: humidityForDay(date),
      windMaxKmh: daily.wind_speed_10m_max[i],
      et0Mm: daily.et0_fao_evapotranspiration[i],
    })),
  );
  if (!days.success)
    throw new ApiError(
      502,
      "WEATHER_INVALID",
      "Weather provider returned incomplete data",
    );
  return { source: "Open-Meteo", location, days: days.data };
}
