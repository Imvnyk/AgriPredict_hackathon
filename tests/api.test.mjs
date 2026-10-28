import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mock, test } from "node:test";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      specifier = pathToFileURL(
        root + "/src/" + specifier.slice(2) + ".ts",
      ).href;
    else if (specifier.startsWith("./") && !/\.[a-z]+$/.test(specifier))
      specifier += ".ts";
    return next(specifier, context);
  },
});
process.env.GOOGLE_API_KEY = "qa-placeholder-never-real";
let response = {
  text: "Conseils prudents fondés sur les observations locales.",
  candidates: [{ finishReason: "STOP" }],
};
let thrown = false;
let sent;
mock.module("@google/genai", {
  exports: {
    GoogleGenAI: class {
      models = {
        generateContent: async (input) => {
          sent = input;
          if (thrown) throw new Error("sensitive provider detail");
          return response;
        },
      };
    },
  },
});
const { POST } = await import(
  pathToFileURL(root + "/src/app/api/advice/route.ts")
);
const { getWeather } = await import(
  pathToFileURL(root + "/src/lib/api/weather.ts")
);
const { farmSchema, defaultFarm, estimateStage } = await import(
  pathToFileURL(root + "/src/lib/farm.ts")
);
const forecast = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-10-${20 + i}`,
  temperatureMinC: 20,
  temperatureMaxC: 34,
  rainfallMm: 0,
  humidityMeanPercent: 45,
  windMaxKmh: 15,
  et0Mm: 4,
}));
const input = {
  crop: "wheat",
  growthStage: "mid",
  waterAvailability: "limited",
  forecast,
};
const call = (language) =>
  POST(
    new Request("http://localhost/api/advice", {
      method: "POST",
      body: JSON.stringify({ assessmentInput: input, language }),
    }),
  );
test("advice success prompts all supported languages, recalculates evidence, and prevents caching", async () => {
  for (const [language, expected] of [
    ["fr", "French"],
    ["ar", "Modern Standard Arabic"],
    ["ary", "Moroccan Darija"],
  ]) {
    const r = await call(language);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.ok(sent.contents.includes(expected));
    assert.ok(sent.contents.includes('"estimatedEtcMm":32.2'));
    assert.ok(sent.contents.includes("Do not prescribe irrigation"));
    assert.equal(sent.model, "gemma-4-26b-a4b-it");
    assert.equal(sent.config.maxOutputTokens, 4096);
  }
});
test("advice rejects missing, truncated, and numeric responses in every numeral script", async () => {
  for (const value of [
    { text: "" },
    { text: "partial", candidates: [{ finishReason: "MAX_TOKENS" }] },
    ...["3", "٣", "۳"].map((n) => ({
      text: "Irrigate " + n,
      candidates: [{ finishReason: "STOP" }],
    })),
  ]) {
    response = value;
    const r = await call("ar");
    assert.equal(r.status, 502);
    assert.ok(
      ["AI_INVALID", "AI_UNGROUNDED"].includes((await r.json()).error.code),
    );
  }
});
test("provider failures return safe errors", async () => {
  thrown = true;
  const r = await call("fr");
  assert.equal(r.status, 502);
  assert.equal((await r.json()).error.code, "AI_UNAVAILABLE");
  thrown = false;
});
const provider = {
  latitude: 33,
  longitude: -5,
  timezone: "Africa/Casablanca",
  daily: {
    time: forecast.map((d) => d.date),
    temperature_2m_min: Array(7).fill(20),
    temperature_2m_max: Array(7).fill(34),
    rain_sum: Array(7).fill(0),
    wind_speed_10m_max: Array(7).fill(15),
    et0_fao_evapotranspiration: Array(7).fill(4),
  },
  hourly: {
    time: forecast.flatMap((d) =>
      Array.from(
        { length: 24 },
        (_, i) => d.date + "T" + String(i).padStart(2, "0") + ":00",
      ),
    ),
    relative_humidity_2m: Array(168).fill(45),
  },
};
test("weather adapter maps real provider fields and computes daily humidity", async () => {
  const m = mock.method(globalThis, "fetch", async (url, opts) => {
    assert.ok(url.href.startsWith("https://api.open-meteo.com/"));
    assert.equal(url.searchParams.get("forecast_days"), "7");
    assert.equal(opts.next.revalidate, 1800);
    return Response.json(provider);
  });
  try {
    const r = await getWeather(33, -5);
    assert.equal(r.days.length, 7);
    assert.deepEqual(r.days[0], forecast[0]);
    assert.equal(r.source, "Open-Meteo");
  } finally {
    m.mock.restore();
  }
});
test("weather adapter rejects HTTP, transport, JSON, incomplete and missing weather instead of inventing values", async () => {
  for (const fake of [
    async () => {
      throw Error("offline");
    },
    async () => new Response("bad", { status: 503 }),
    async () => new Response("bad"),
    async () => Response.json({}),
    async () =>
      Response.json({
        ...provider,
        daily: { ...provider.daily, rain_sum: [null, 0, 0, 0, 0, 0, 0] },
      }),
    async () =>
      Response.json({
        ...provider,
        hourly: {
          ...provider.hourly,
          relative_humidity_2m: [
            null,
            ...provider.hourly.relative_humidity_2m.slice(1),
          ],
        },
      }),
    async () =>
      Response.json({ ...provider, hourly: { ...provider.hourly, time: [] } }),
  ]) {
    const m = mock.method(globalThis, "fetch", fake);
    try {
      await assert.rejects(
        getWeather(33, -5),
        (e) =>
          e.status === 502 &&
          ["WEATHER_INVALID", "WEATHER_UNAVAILABLE"].includes(e.code),
      );
    } finally {
      m.mock.restore();
    }
  }
});
test("farm validation rejects future dates, invalid crops, missing fields and out-of-region coordinates", () => {
  for (const value of [
    { name: " " },
    { latitude: 0 },
    { longitude: 1 },
    { crop: "olive" },
    { plantingDate: "2999-01-01" },
    { waterAvailability: "none" },
  ])
    assert.equal(
      farmSchema.safeParse({ ...defaultFarm, ...value }).success,
      false,
    );
  for (const waterAvailability of ["adequate", "limited", "unknown"])
    assert.equal(
      farmSchema.safeParse({ ...defaultFarm, waterAvailability }).success,
      true,
    );
});
test("calendar estimates follow FAO stage boundaries for both crops", () => {
  const original = Date.now;
  Date.now = () => Date.parse("2026-10-28T12:00:00Z");
  try {
    for (const [crop, bounds] of [
      ["wheat", [30, 170, 210]],
      ["tomato", [30, 70, 115]],
    ])
      for (const [days, stage] of [
        [0, "initial"],
        [29, "initial"],
        [bounds[0], "development"],
        [bounds[1] - 1, "development"],
        [bounds[1], "mid"],
        [bounds[2] - 1, "mid"],
        [bounds[2], "late"],
      ])
        assert.equal(
          estimateStage(
            crop,
            new Date(Date.now() - days * 86400000).toISOString().slice(0, 10),
          ),
          stage,
        );
  } finally {
    Date.now = original;
  }
});

test("stage boundaries use the farm's Casablanca calendar date around midnight", () => {
  const original = Date.now;
  Date.now = () => Date.parse("2026-07-28T23:30:00Z");
  try {
    assert.equal(estimateStage("tomato", "2026-06-29"), "development");
  } finally {
    Date.now = original;
  }
});
