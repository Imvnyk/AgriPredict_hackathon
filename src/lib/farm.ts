import { z } from "zod";

import type { AssessmentInput } from "./api/schema";

export const locations = [
  {
    name: "Meknès",
    region: "Fès-Meknès",
    latitude: 33.8935,
    longitude: -5.5473,
  },
  {
    name: "Marrakech",
    region: "Marrakech-Safi",
    latitude: 31.6295,
    longitude: -7.9811,
  },
  {
    name: "Agadir",
    region: "Souss-Massa",
    latitude: 30.4278,
    longitude: -9.5981,
  },
  {
    name: "Béni Mellal",
    region: "Béni Mellal-Khénifra",
    latitude: 32.3373,
    longitude: -6.3498,
  },
  {
    name: "Settat",
    region: "Casablanca-Settat",
    latitude: 33.001,
    longitude: -7.6166,
  },
];
export const farmSchema = z.object({
  name: z.string().trim().min(1).max(60),
  location: z.coerce
    .number()
    .int()
    .min(0)
    .max(locations.length - 1),
  latitude: z.coerce.number().min(20).max(37),
  longitude: z.coerce.number().min(-18).max(0),
  crop: z.enum(["wheat", "tomato"]),
  plantingDate: z.union([z.literal(""), z.iso.date()]).refine(
    (v) =>
      !v ||
      v <=
        new Date().toLocaleDateString("en-CA", {
          timeZone: "Africa/Casablanca",
        }),
    "Planting date cannot be in the future",
  ),
  growthStage: z.enum(["initial", "development", "mid", "late"]),
  waterAvailability: z.enum(["adequate", "limited", "unknown"]),
});
export type Farm = z.infer<typeof farmSchema>;
export const defaultFarm: Farm = {
  name: "My farm",
  location: 0,
  latitude: 33.8935,
  longitude: -5.5473,
  crop: "wheat",
  plantingDate: "",
  growthStage: "development",
  waterAvailability: "limited",
};
export const stages = {
  initial: "Establishment",
  development: "Development",
  mid: "Mid-season",
  late: "Maturation",
};
// FAO-56 table 11: indicative Mediterranean winter wheat and tomato durations.
// Calendar days alone cannot determine phenology. These estimates require field confirmation.
export function estimateStage(
  crop: Farm["crop"],
  date: string,
): Farm["growthStage"] {
  const today = new Date(Date.now()).toLocaleDateString("en-CA", {
    timeZone: "Africa/Casablanca",
  });
  const days = Math.max(0, (Date.parse(today) - Date.parse(date)) / 86400000);
  const bounds = crop === "wheat" ? [30, 170, 210] : [30, 70, 115];
  return days < bounds[0]
    ? "initial"
    : days < bounds[1]
      ? "development"
      : days < bounds[2]
        ? "mid"
        : "late";
}
export function exampleForecast(heatwave = false): AssessmentInput["forecast"] {
  return [26, 28, 31, 33, 30, 27, 25].map((temp, i) => {
    const day = new Date();
    day.setDate(day.getDate() + i);
    return {
      date: day.toLocaleDateString("en-CA", { timeZone: "Africa/Casablanca" }),
      temperatureMaxC: temp + (heatwave ? 8 : 0),
      temperatureMinC: 14 + (i % 4) + (heatwave ? 5 : 0),
      rainfallMm: heatwave ? 0 : [0, 0, 0, 0, 0.5, 2.4, 1.2][i],
      humidityMeanPercent: 54 - i,
      windMaxKmh: [12, 15, 18, 21, 16, 13, 10][i],
      et0Mm: [3.8, 4.2, 4.7, 5.1, 4.4, 3.6, 3.4][i] + (heatwave ? 1.5 : 0),
    };
  });
}
