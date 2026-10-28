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

test("malformed calendar dates return validation errors without throwing", () => {
  for (const invalid of ["invalid", "", "2026-02-30", "2026-13-01"]) {
    for (const index of [0, 3, 6]) {
      assert.equal(
        assessmentInputSchema.safeParse({
          ...base,
          forecast: forecast.map((d, i) =>
            i === index ? { ...d, date: invalid } : d,
          ),
        }).success,
        false,
      );
    }
  }
});

test("heat screening boundaries and day-count heuristics match the methodology", () => {
  for (const crop of ["wheat", "tomato"]) {
    const threshold = crop === "wheat" ? 30 : 35;
    for (const stage of ["initial", "development", "mid", "late"]) {
      for (const count of [0, 1, 2, 3, 7]) {
        const result = assess({
          ...base,
          crop,
          growthStage: stage,
          forecast: forecast.map((d, i) => ({
            ...d,
            temperatureMaxC: i < count ? threshold : threshold - 0.1,
          })),
        });
        assert.equal(result.heat.hotDays.length, count);
        assert.equal(
          result.heat.level,
          count === 0
            ? "low"
            : count >= 3 || (stage === "mid" && count >= 2)
              ? "high"
              : "moderate",
        );
      }
    }
  }
});

test("FAO coefficient approximations and water categories match the documented arithmetic", () => {
  const coefficients = {
    wheat: [0.3, 0.725, 1.15, 0.7375],
    tomato: [0.6, 0.875, 1.15, 0.975],
  };
  for (const crop of ["wheat", "tomato"]) {
    for (const [i, growthStage] of [
      "initial",
      "development",
      "mid",
      "late",
    ].entries()) {
      const result = assess({ ...base, crop, growthStage });
      assert.equal(result.water.cropCoefficient, coefficients[crop][i]);
      assert.equal(
        result.water.estimatedEtcMm,
        Math.round(28 * coefficients[crop][i] * 100) / 100,
      );
    }
  }
  for (const waterAvailability of ["adequate", "limited", "unknown"]) {
    const dry = assess({ ...base, waterAvailability });
    assert.equal(
      dry.water.level,
      waterAvailability === "unknown"
        ? "unknown"
        : waterAvailability === "limited"
          ? "high"
          : "moderate",
    );
    const wet = assess({
      ...base,
      waterAvailability,
      forecast: forecast.map((d) => ({ ...d, rainfallMm: 20 })),
    });
    assert.equal(
      wet.water.level,
      waterAvailability === "unknown" ? "unknown" : "low",
    );
    assert.ok(wet.limitations.some((s) => s.includes("soil storage")));
  }
});
