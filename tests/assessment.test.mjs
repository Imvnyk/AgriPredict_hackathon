import assert from "node:assert/strict";
import { test } from "node:test";

import { assess } from "../src/lib/api/assessment.ts";
import { assessmentInputSchema } from "../src/lib/api/schema.ts";

const forecast = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-07-0${i + 1}`,
  temperatureMinC: 20,
  temperatureMaxC: 29,
  rainfallMm: 0,
  humidityMeanPercent: 50,
  windMaxKmh: 20,
  et0Mm: 4,
}));
const base = {
  crop: "wheat",
  growthStage: "mid",
  waterAvailability: "limited",
  forecast,
};
test("calculates crop demand and screening risks", () => {
  const result = assess({
    ...base,
    forecast: forecast.map((d, i) => ({
      ...d,
      temperatureMaxC: i < 2 ? 30 : 29,
    })),
  });
  assert.equal(result.heat.level, "high");
  assert.equal(result.water.estimatedEtcMm, 32.2);
  assert.equal(result.water.level, "high");
});
test("unknown availability stays unknown and rain does not guarantee actual water status", () => {
  const result = assess({
    ...base,
    waterAvailability: "unknown",
    forecast: forecast.map((d) => ({ ...d, rainfallMm: 20 })),
  });
  assert.equal(result.water.level, "unknown");
  assert.equal(result.water.demandExceedsRain, false);
});
test("rejects invalid and discontinuous weather", () => {
  assert.equal(
    assessmentInputSchema.safeParse({ ...base, forecast: forecast.slice(0, 6) })
      .success,
    false,
  );
  assert.equal(
    assessmentInputSchema.safeParse({
      ...base,
      forecast: forecast.map((d, i) =>
        i === 1 ? { ...d, date: "2026-07-03" } : d,
      ),
    }).success,
    false,
  );
  assert.equal(
    assessmentInputSchema.safeParse({
      ...base,
      forecast: forecast.map((d, i) => (i === 0 ? { ...d, et0Mm: -1 } : d)),
    }).success,
    false,
  );
});
