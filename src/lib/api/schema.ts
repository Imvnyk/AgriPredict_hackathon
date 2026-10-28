import { z } from "zod";

const finite = z.number().finite();
const date = z.iso.date();
export const daySchema = z
  .object({
    date,
    temperatureMinC: finite.min(-90).max(65),
    temperatureMaxC: finite.min(-90).max(65),
    rainfallMm: finite.min(0).max(2000),
    humidityMeanPercent: finite.min(0).max(100),
    windMaxKmh: finite.min(0).max(500),
    et0Mm: finite.min(0).max(50),
  })
  .strict()
  .refine(
    (d) => d.temperatureMinC <= d.temperatureMaxC,
    "Minimum temperature must not exceed maximum",
  );
export const forecastSchema = z
  .array(daySchema)
  .length(7)
  .superRefine((days, ctx) => {
    for (let i = 1; i < days.length; i++) {
      // Refinements can run after a child date has failed validation.
      // Leave invalid dates to the date schema instead of throwing in toISOString.
      if (
        !date.safeParse(days[i - 1].date).success ||
        !date.safeParse(days[i].date).success
      )
        continue;
      const next = new Date(`${days[i - 1].date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      if (next.toISOString().slice(0, 10) !== days[i].date)
        ctx.addIssue({
          code: "custom",
          message: "Forecast dates must be consecutive and increasing",
          path: [i, "date"],
        });
    }
  });
export const assessmentInputSchema = z
  .object({
    crop: z.enum(["wheat", "tomato"]),
    growthStage: z.enum(["initial", "development", "mid", "late"]),
    waterAvailability: z.enum(["adequate", "limited", "unknown"]),
    forecast: forecastSchema,
  })
  .strict();
export type AssessmentInput = z.infer<typeof assessmentInputSchema>;
export const adviceInputSchema = z
  .object({
    assessmentInput: assessmentInputSchema,
    language: z.enum(["ar", "fr", "ary"]),
  })
  .strict();
