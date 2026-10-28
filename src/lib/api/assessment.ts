import type { AssessmentInput } from "./schema";

// Screening temperatures, not universal crop damage thresholds. Sensitivity depends on variety and exposure duration.
const heatScreenC = { wheat: 30, tomato: 35 } as const;
// FAO-56 Table 12 standard coefficients. Development and late are midpoint approximations.
const coefficients = {
  wheat: { initial: 0.3, development: 0.725, mid: 1.15, late: 0.775 },
  tomato: { initial: 0.6, development: 0.875, mid: 1.15, late: 0.975 },
} as const;
const round = (n: number) => Math.round(n * 100) / 100;
export function assess(input: AssessmentInput) {
  const { crop, growthStage, waterAvailability, forecast } = input;
  const thresholdC = heatScreenC[crop];
  const hotDays = forecast
    .filter((d) => d.temperatureMaxC >= thresholdC)
    .map((d) => d.date);
  const heatLevel =
    hotDays.length === 0
      ? "low"
      : hotDays.length >= 3 || (growthStage === "mid" && hotDays.length >= 2)
        ? "high"
        : "moderate";
  const kc = coefficients[crop][growthStage];
  const et0Mm = round(forecast.reduce((sum, d) => sum + d.et0Mm, 0));
  const rainfallMm = round(forecast.reduce((sum, d) => sum + d.rainfallMm, 0));
  const estimatedEtcMm = round(et0Mm * kc);
  // Gross rainfall is an optimistic proxy: it is not effective rainfall or a soil water balance.
  const demandExceedsRain = estimatedEtcMm > rainfallMm;
  const waterLevel =
    waterAvailability === "unknown"
      ? "unknown"
      : waterAvailability === "limited" && demandExceedsRain
        ? "high"
        : demandExceedsRain
          ? "moderate"
          : "low";
  return {
    crop,
    growthStage,
    waterAvailability,
    period: { start: forecast[0].date, end: forecast[6].date },
    heat: {
      level: heatLevel,
      screeningTemperatureC: thresholdC,
      hotDays,
      maxTemperatureC: Math.max(...forecast.map((d) => d.temperatureMaxC)),
    },
    water: {
      level: waterLevel,
      et0Mm,
      rainfallMm,
      cropCoefficient: kc,
      estimatedEtcMm,
      demandExceedsRain,
    },
    limitations: [
      "Heat thresholds and risk categories are screening heuristics, not predictions of damage or yield loss; daily maxima do not describe exposure duration.",
      "ETc uses approximate standard FAO crop coefficients without local climate adjustment. Gross rainfall is not effective rainfall; runoff, soil storage and actual irrigation are unknown.",
      "Water availability is self-reported; actual crop water stress requires local soil and crop observations.",
    ],
    sources: [
      "https://www.fao.org/4/x0490e/x0490e0a.htm",
      "https://www.fao.org/4/x0490e/x0490e0b.htm",
      "https://www.fao.org/4/x0490e/x0490e0e.htm",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC6754161/",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10014533/",
    ],
  };
}
